/**
 * Feed-target policy (`lib/feed-target.ts`) — the guard in front of every
 * URL a customer can hand to our server.
 *
 * Pure by design: `assertPublicFeedTarget` takes the DNS resolver, so the whole
 * rule set runs here with no network and no cloud metadata endpoint involved.
 * The shapes tested are the ones that actually fool a string check — integer and
 * hex loopback literals, IPv6 shorthand, a NAT64 prefix wrapping 127.0.0.1, a
 * name with one good address and one bad one.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  FeedTargetError,
  assertPublicFeedTarget,
  isInternalAddress,
  isInternalHostname,
  isInternalIpv4,
  isInternalIpv6,
} from '@/lib/feed-target';

const PUBLIC = ['93.184.216.34'];
const resolver = (addresses = PUBLIC) => async () => addresses;

const blocked = (url, resolve) =>
  assertPublicFeedTarget(url, resolve ?? resolver()).then(
    () => {
      throw new Error(`expected ${url} to be blocked`);
    },
    (e) => e,
  );

// ---------------------------------------------------------------------------
// Shape of the request itself
// ---------------------------------------------------------------------------

test('only http(s) URLs get as far as a lookup', async () => {
  for (const url of ['not a url', 'file:///etc/passwd', 'gopher://127.0.0.1:1111/', 'javascript:alert(1)']) {
    const e = await blocked(url);
    assert.ok(e instanceof FeedTargetError, `${url} rejected by the policy`);
    assert.ok(['NOT_A_URL', 'SCHEME'].includes(e.reason), `${url} -> ${e.reason}`);
  }
});

test('credentials in a feed URL are refused, not stripped', async () => {
  const e = await blocked('http://admin:pw@feed.example/rss');
  assert.equal(e.reason, 'HOSTNAME');
});

// ---------------------------------------------------------------------------
// Names that can never be a public feed
// ---------------------------------------------------------------------------

test('machine-internal names are blocked before any lookup', async () => {
  let lookedUp = false;
  const spy = async () => {
    lookedUp = true;
    return PUBLIC;
  };
  for (const host of ['localhost', 'IP6-LOCALHOST', 'metadata', 'metadata.google.internal', 'instance-data', 'printer.local', 'db.internal', 'box.home.arpa']) {
    const e = await blocked(`http://${host}/feed`, spy);
    assert.equal(e.reason, 'INTERNAL_NAME', `${host} blocked as an internal name`);
  }
  assert.equal(lookedUp, false, 'a name we will never connect to is not worth a DNS query');
  assert.equal(isInternalHostname('feed.bbc.co.uk'), false);
});

// ---------------------------------------------------------------------------
// IP literals, including the forms a naive parser reads as something else
// ---------------------------------------------------------------------------

test('loopback and private v4 literals are blocked', () => {
  for (const ip of ['127.0.0.1', '127.42.1.1', '10.0.0.5', '172.16.0.1', '172.31.255.255', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '255.255.255.255', '198.18.0.1', '224.0.0.1']) {
    assert.equal(isInternalIpv4(ip), true, `${ip} is internal`);
  }
});

test('public v4 is allowed, and 172.32 is not mistaken for 172.16/12', () => {
  for (const ip of ['93.184.216.34', '8.8.8.8', '172.32.0.1', '100.128.0.1', '169.253.0.1']) {
    assert.equal(isInternalIpv4(ip), false, `${ip} is reachable`);
  }
});

test('a v4 literal in the URL is judged without asking DNS', async () => {
  for (const url of ['http://127.0.0.1/rss', 'http://169.254.169.254/latest/meta-data/', 'https://10.1.2.3/feed.xml']) {
    const e = await blocked(url, async () => {
      throw new Error('must not resolve a literal address');
    });
    assert.equal(e.reason, 'INTERNAL_ADDRESS', `${url} blocked at the literal`);
  }
  const ok = await assertPublicFeedTarget('http://93.184.216.34/rss', async () => {
    throw new Error('must not resolve a literal address');
  });
  assert.equal(ok.hostname, '93.184.216.34');
});

test('the IP shorthand tricks are blocked, whichever rule happens to catch them', async () => {
  // The WHATWG parser rewrites these to a canonical host before we see it, so
  // 2130706433 arrives as 127.0.0.1 and is caught as an address. The forms it
  // leaves alone (`1.2.3.4.5`, `999.999`) are caught as hostnames: a numeric
  // host that is not a full v4 literal never gets a DNS lookup, because a
  // permissive resolver would happily turn it into loopback.
  const asAddress = ['http://2130706433/', 'http://0x7f000001/', 'http://127.1/', 'http://0177.0.0.1/'];
  for (const url of asAddress) {
    const e = await blocked(url);
    assert.equal(e.reason, 'INTERNAL_ADDRESS', `${url} blocked as the address it really is`);
  }
  let resolved = 0;
  const counting = async () => {
    resolved += 1;
    return PUBLIC;
  };
  for (const url of ['http://a/', 'http://1.2.3.4.5/', 'http://999.999/', 'http://1.2.3.4.5:8080/x']) {
    const e = await blocked(url, counting);
    assert.ok(
      ['NOT_A_URL', 'HOSTNAME', 'INTERNAL_ADDRESS'].includes(e.reason),
      `${url} blocked as a malformed or non-DNS host (got ${e.reason})`,
    );
  }
  assert.equal(resolved, 0, 'none of these reach the resolver — that is the property, not which rule fires');
});

test('v6 shorthand, link-local, mapped and NAT64-wrapped loopback are blocked', () => {
  for (const ip of ['::1', '::', 'fe80::1', 'fd00::1234', 'ff02::1', '2001:db8::1', '100::1']) {
    assert.equal(isInternalIpv6(ip), true, `${ip} is internal`);
  }
  assert.equal(isInternalIpv6('::ffff:127.0.0.1'), true, 'IPv4-mapped loopback');
  assert.equal(isInternalIpv6('64:ff9b::7f00:1'), true, 'NAT64 wrapper around 127.0.0.1');
  assert.equal(isInternalIpv6('2606:2800:220:1:248:1893:25c8:1946'), false, 'a real v6 address');
  assert.equal(isInternalIpv6('64:ff9b::8.8.8.8'), false, 'NAT64 around a public v4 address');
});

test('bracketed v6 in a URL is judged, not skipped', async () => {
  for (const url of ['http://[::1]:3000/feed', 'http://[fe80::1]/rss']) {
    const e = await blocked(url, resolver());
    assert.equal(e.reason, 'INTERNAL_ADDRESS', `${url} blocked`);
  }
});

test('anything that is not an address at all fails closed', () => {
  assert.equal(isInternalAddress('nonsense'), true);
  assert.equal(isInternalAddress('999.1.1.1'), true);
  assert.equal(isInternalAddress('127.0.0.1%eth0'), true, 'a zone id does not launder loopback');
});

// ---------------------------------------------------------------------------
// Names that resolve — the point where a string check stops working
// ---------------------------------------------------------------------------

test('a name is judged by every address it resolves to', async () => {
  // One good record and one bad one is the classic trick: if any hop is
  // internal, nothing about this name is trustworthy.
  const e = await blocked('http://feed.example/rss', async () => ['93.184.216.34', '169.254.169.254']);
  assert.equal(e.reason, 'INTERNAL_ADDRESS');

  const ok = await assertPublicFeedTarget('http://feed.example/rss', resolver(['93.184.216.34', '2606:2800:220::1']));
  assert.equal(ok.url.pathname, '/rss');
});

test('a name that does not resolve is an error, never a silent pass', async () => {
  const empty = await blocked('http://gone.example/rss', async () => []);
  assert.equal(empty.reason, 'NO_ADDRESS');
  const thrown = await blocked('http://gone.example/rss', async () => {
    throw new Error('ENOTFOUND');
  });
  assert.equal(thrown.reason, 'NO_ADDRESS');
});

test('a target is judged before the socket opens, and every hop after it', async () => {
  // The redirect loop feeds each `Location` back through this same function, so
  // "allow the hostname, land on the metadata IP" is not a way in.
  const hop = await blocked('http://169.254.169.254/latest/meta-data/iam/security-credentials/', resolver());
  assert.equal(hop.reason, 'INTERNAL_ADDRESS');
});
