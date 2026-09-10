/**
 * Where a server-side fetch is allowed to connect, given a URL a *user* typed.
 *
 * Why this exists: `/api/news/preview` lets a customer point our server at an
 * arbitrary RSS URL to see what a custom feed would contain. "It is only a GET"
 * is not a mitigation — a GET to `http://169.254.169.254/` reads cloud
 * credentials, `http://127.0.0.1:5432/` probes our own network, and a large
 * response body is a cheap way to exhaust memory. The URL has to be resolved
 * and judged as an *address*, not just parsed as a string, because
 * `http://2130706433/`, `http://0x7f000001/` and `http://localhost.nip.io/`
 * all reach the loopback interface while looking nothing like it.
 *
 * The policy is pure: address checks take strings, and DNS is injected, so the
 * whole rule set is covered by plain-Node tests (see
 * `src/lib/__tests__/feed-target.test.mjs`) without a network or a cloud VM.
 *
 * Residual risk, stated honestly: this is validate-then-fetch, so a DNS name
 * with a short TTL can still be rebound between the check and the connection.
 * Closing that needs a pinned socket at the transport layer, which `fetch` does
 * not offer. Two things shrink the window: redirects are re-validated hop by
 * hop (the classic bypass of "allow the hostname, land on the metadata IP"),
 * and every address a name resolves to must be public, so an attacker cannot
 * win by publishing one good and one bad record.
 */

export type FeedBlockReason =
  | 'NOT_A_URL'
  | 'SCHEME'
  | 'HOSTNAME'
  | 'INTERNAL_NAME'
  | 'NO_ADDRESS'
  | 'INTERNAL_ADDRESS';

export class FeedTargetError extends Error {
  reason: FeedBlockReason;

  constructor(reason: FeedBlockReason, message: string) {
    super(message);
    this.name = 'FeedTargetError';
    this.reason = reason;
  }
}

/** Names that only ever resolve on the machine or inside a private network. */
const INTERNAL_HOSTNAMES = new Set([
  'localhost',
  'ip6-localhost',
  'ip6-loopback',
  'localhost.localdomain',
  'metadata',
  'metadata.google.internal',
  'metadata.goog',
  'instance-data',
]);

/** TLD-less suffixes reserved for private names (RFC 6761 / 8375). */
const INTERNAL_SUFFIXES = ['.localhost', '.local', '.internal', '.home.arpa', '.localdomain', '.intranet'];

/** A host that could be a real public DNS name: dotted, safe characters only. */
const DNS_NAME = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;

function octets(ip: string): number[] | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  const out: number[] = [];
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const n = Number(part);
    if (n > 255) return null;
    out.push(n);
  }
  return out;
}

/**
 * IPv4 addresses a server fetch must never reach.
 *
 * Beyond RFC 1918: link-local (which carries the AWS/GCP/OpenStack metadata
 * service at 169.254.169.254 and every cloud's IMDS endpoint), CGNAT (how many
 * container networks are addressed), the "this host" 0/8 block, documentation
 * and benchmarking ranges, and multicast/reserved.
 */
export function isInternalIpv4(ip: string): boolean {
  const parts = octets(ip);
  if (!parts) return true; // not a parseable v4 literal: treat as internal
  const [a, b] = parts;
  if (a === 0) return true; // 0.0.0.0/8  "this host"
  if (a === 10) return true; // 10/8
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64/10 CGNAT
  if (a === 127) return true; // loopback
  if (a === 169 && b === 254) return true; // link-local + cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16/12
  if (a === 192 && b === 0) return true; // 192.0.0/24 + 192.0.2/24 (doc)
  if (a === 192 && b === 168) return true; // 192.168/16
  if (a === 198 && (b === 18 || b === 19)) return true; // 198.18/15 benchmarking
  if (a === 198 && b === 51) return true; // 198.51.100/24 (doc)
  if (a === 203 && b === 0) return true; // 203.0.113/24 (doc)
  if (a === 240) return true; // 240/4 reserved, includes 255.255.255.255
  if (a >= 224) return true; // 224/4 multicast + the rest of the reserved top
  return false;
}

/**
 * Expand an IPv6 literal (any shorthand, optional embedded v4) to 8 groups.
 *
 * The trailing dotted-quad is replaced by the two groups it stands for *before*
 * splitting on `::`, otherwise chopping it off destroys the `::` marker and
 * `64:ff9b::8.8.8.8` looks unparseable.
 */
function ipv6Groups(ip: string): string[] | null {
  const clean = ip.toLowerCase().replace(/^\[|\]$/g, '').split('%')[0];
  if (!clean.includes(':')) return null;
  const parts = clean.split(':');
  const v4 = octets(parts[parts.length - 1] ?? '');
  if (v4) {
    parts.pop();
    parts.push(((v4[0] << 8) | v4[1]).toString(16), ((v4[2] << 8) | v4[3]).toString(16));
  }
  const halves = parts.join(':').split('::');
  if (halves.length > 2) return null;
  const split = (half: string) => half.split(':').filter((g) => g !== '');
  if ([...split(halves[0] ?? ''), ...split(halves[1] ?? '')].some((g) => !/^[0-9a-f]{1,4}$/.test(g))) {
    return null; // not hex: judge it internal rather than comparing NaN
  }
  const front = halves[0] ? split(halves[0]) : [];
  const back = halves.length === 2 ? split(halves[1] ?? '') : [];
  const groups =
    halves.length === 2
      ? [...front, ...Array(Math.max(0, 8 - front.length - back.length)).fill('0'), ...back]
      : [...front, ...back];
  if (groups.length !== 8) return null;
  return groups.map((g) => g.padStart(4, '0'));
}

/** First 16 bits of each group pair, as a number, for prefix comparisons. */
function ipv6Prefix(ip: string): number[] | null {
  const groups = ipv6Groups(ip);
  if (!groups) return null;
  return groups.map((g) => parseInt(g, 16));
}

/**
 * IPv6 addresses a server fetch must never reach. Mirrors the v4 list:
 * unspecified, loopback, link-local, unique-local (fc00::/7), multicast,
 * discard-only, documentation, and the NAT64 well-known prefix, which embeds
 * an IPv4 address (so `64:ff9b::7f00:1` is loopback in disguise).
 */
export function isInternalIpv6(ip: string): boolean {
  const p = ipv6Prefix(ip);
  if (!p) return true;
  if (p.every((g) => g === 0)) return true; // :: unspecified
  if (p[7] === 1 && p.slice(0, 7).every((g) => g === 0)) return true; // ::1
  if ((p[0] & 0xff00) === 0xff00) return true; // ff00::/8 multicast
  if (p[0] === 0x100) return true; // 100::/64 discard
  if ((p[0] & 0xfe00) === 0xfc00) return true; // fc00::/7 unique-local
  if ((p[0] & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  if (p[0] === 0x2001 && p[1] === 0x0db8) return true; // 2001:db8::/32 doc
  if (p[0] === 0x0064 && p[1] === 0xff9b) {
    // 64:ff9b::/96 — well-known NAT64: the last 32 bits are a v4 address.
    const v4 = `${(p[6] >> 8) & 0xff}.${p[6] & 0xff}.${(p[7] >> 8) & 0xff}.${p[7] & 0xff}`;
    return isInternalIpv4(v4);
  }
  if (p[5] === 0xffff && p.slice(0, 5).every((g) => g === 0)) {
    // ::ffff:0:0/96 — IPv4-mapped (the marker sits in group 5, not group 3).
    const v4 = `${(p[6] >> 8) & 0xff}.${p[6] & 0xff}.${(p[7] >> 8) & 0xff}.${p[7] & 0xff}`;
    return isInternalIpv4(v4);
  }
  return false;
}

/** True for anything a user-supplied fetch must not connect to. */
export function isInternalAddress(address: string): boolean {
  const bare = address.replace(/^\[|\]$/g, '').split('%')[0];
  if (bare.includes(':')) return isInternalIpv6(bare);
  if (bare.includes('.')) return isInternalIpv4(bare);
  return true; // not an IP literal at all — fail closed
}

/** `true` when the name itself can never be a public feed host. */
export function isInternalHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  if (INTERNAL_HOSTNAMES.has(host)) return true;
  return INTERNAL_SUFFIXES.some((suffix) => host.endsWith(suffix));
}

export type AddressResolver = (hostname: string) => Promise<string[]>;

export interface AllowedFeedTarget {
  /** The URL as parsed, with the port it will actually be reached on. */
  url: URL;
  hostname: string;
}

/**
 * Judge one URL before any connection is made.
 *
 * Throws `FeedTargetError` with a machine-readable `reason`; callers map it to
 * their own error code and never echo the target back beyond a fixed line.
 */
export async function assertPublicFeedTarget(raw: string, resolve: AddressResolver): Promise<AllowedFeedTarget> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new FeedTargetError('NOT_A_URL', 'That is not a valid URL.');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new FeedTargetError('SCHEME', 'Only http(s) feeds are supported.');
  }
  if (url.username || url.password) {
    throw new FeedTargetError('HOSTNAME', 'A feed URL cannot carry credentials.');
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  if (isInternalHostname(hostname)) {
    throw new FeedTargetError('INTERNAL_NAME', 'That host is a machine-internal name.');
  }

  const isV4Literal = octets(hostname) !== null;
  const isV6Literal = hostname.includes(':');
  // Digits-and-dots only: `127.1` and `1.2.3.4.5` are not DNS names, and a
  // permissive resolver turns them into loopback. Only a full v4 literal may
  // be numeric.
  const numericOnly = /^[0-9.]+$/.test(hostname);
  if (numericOnly && !isV4Literal) {
    throw new FeedTargetError('HOSTNAME', 'That address is not a valid feed target.');
  }
  if (!isV4Literal && !isV6Literal && !DNS_NAME.test(hostname)) {
    // Rejects `2130706433`, `0x7f000001`, `127.1`, `a` — every shorthand form
    // a resolver would happily turn into a loopback address.
    throw new FeedTargetError('HOSTNAME', 'That host is not a resolvable feed address.');
  }

  if (isV4Literal && isInternalIpv4(hostname)) {
    throw new FeedTargetError('INTERNAL_ADDRESS', 'That address is on a private or reserved network.');
  }
  if (isV6Literal && isInternalIpv6(hostname)) {
    throw new FeedTargetError('INTERNAL_ADDRESS', 'That address is on a private or reserved network.');
  }
  if (isV4Literal || isV6Literal) {
    return { url, hostname };
  }

  let addresses: string[];
  try {
    addresses = await resolve(hostname);
  } catch {
    throw new FeedTargetError('NO_ADDRESS', 'That host does not resolve.');
  }
  if (addresses.length === 0) throw new FeedTargetError('NO_ADDRESS', 'That host does not resolve.');
  if (addresses.some((address) => isInternalAddress(address))) {
    throw new FeedTargetError('INTERNAL_ADDRESS', 'That host resolves to a private or reserved address.');
  }
  return { url, hostname };
}
