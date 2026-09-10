/**
 * Which origin this deployment may hand to PayFast — pure, no Next imports.
 *
 * `return_url`, `cancel_url` and `notify_url` are baked into the SIGNED
 * checkout request, so whatever ends up in them is paid-for truth as far as
 * PayFast is concerned: the customer is sent back there after paying, and the
 * ITN (payer email, amount, token, `m_payment_id`, signature) is posted there.
 * Trusting the request's own Host header would let an attacker who can make a
 * victim's checkout request carry `Host: evil.example` aim all three at their
 * own server. So the origin is only ever an origin this deployment declared.
 *
 * Lives on its own so the whole policy is testable from plain Node: the module
 * that uses it (`lib/billing-request.ts`) also pulls in Supabase and
 * `next/headers`, which the test runner cannot resolve.
 *
 * Resolution order:
 *   1. `NEXT_PUBLIC_SITE_URL` — the pinned origin. Wins outright; the headers
 *      are not consulted at all.
 *   2. A host listed in `TENDERBASE_ALLOWED_HOSTS` — for a deployment that
 *      legitimately serves more than one origin (a tunnel, blue/green, staging
 *      on the same image). Exact match against configuration, never a default.
 *   3. Outside production only: the request host, so a local or sandboxed
 *      preview works with zero setup. `isAuthBypassed` in
 *      `lib/supabase-config.ts` uses the same hard `NODE_ENV` gate.
 *
 * Anything else fails, and `billingGate` answers 503 with a message naming the
 * variable to set — a misconfiguration is reported, not papered over with a form
 * pointed at somebody else's domain.
 */

/** Only `host` or `host:port`. No scheme, no path, no `@`, no `#`. */
const SAFE_HOST = /^[a-z0-9]([a-z0-9.-]*[a-z0-9])?(:\d{1,5})?$/i;

function firstHeaderValue(value: string | null | undefined): string {
  return (value ?? '').split(',')[0]?.trim() ?? '';
}

/** A bare host, lowercased, with any scheme/path a config author typed removed. */
function normalizeHost(value: string): string {
  let host = value.trim().toLowerCase();
  if (!host) return '';
  if (host.includes('://')) {
    try {
      host = new URL(host).host;
    } catch {
      return '';
    }
  }
  return host.replace(/\/+$/, '');
}

/**
 * Turn a scheme + host pair into an origin, or null if the host is not shaped
 * like one. The regex check is what stops `Host: evil.example/#@good.example`
 * (or any other smuggled character) from becoming a valid-looking origin.
 */
export function originFromHost(proto: string, host: string): string | null {
  const clean = normalizeHost(host);
  if (!clean || !SAFE_HOST.test(clean)) return null;
  return `${proto === 'http' ? 'http' : 'https'}://${clean}`;
}

export interface SiteOriginInput {
  siteUrl?: string;
  allowedHosts?: string;
  forwardedHost?: string | null;
  host?: string | null;
  forwardedProto?: string | null;
  isProduction?: boolean;
}

export type SiteOriginOutcome =
  | { ok: true; origin: string; source: 'site_url' | 'allowed_hosts' | 'request' }
  | { ok: false; error: 'site_url_unpinned' | 'host_not_allowed'; message: string };

/** Pure and header-string-driven so the whole policy is testable without Next. */
export function resolveSiteOrigin(input: SiteOriginInput): SiteOriginOutcome {
  const isProduction = input.isProduction ?? process.env.NODE_ENV === 'production';
  const requestHost = firstHeaderValue(input.forwardedHost) || firstHeaderValue(input.host);
  const proto = firstHeaderValue(input.forwardedProto) === 'http' ? 'http' : 'https';

  const pinned = input.siteUrl?.trim();
  if (pinned) {
    // Parsed as a URL, not from the request: a pin without a scheme means
    // https, and `x-forwarded-proto` gets no vote on how we are reached.
    const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(pinned) ? pinned : `https://${pinned}`;
    let url: URL | null = null;
    try {
      url = new URL(withScheme);
    } catch {
      url = null;
    }
    if (!url || (url.protocol !== 'https:' && url.protocol !== 'http:')) {
      return {
        ok: false,
        error: 'site_url_unpinned',
        message: 'NEXT_PUBLIC_SITE_URL is set but is not a valid origin (use https://your-domain.example).',
      };
    }
    return { ok: true, origin: url.origin, source: 'site_url' };
  }

  const allowed = (input.allowedHosts ?? '')
    .split(',')
    .map((entry) => normalizeHost(entry))
    .filter(Boolean);

  if (requestHost) {
    const wanted = normalizeHost(requestHost);
    if (allowed.includes(wanted)) {
      const origin = originFromHost(proto, requestHost);
      if (origin) return { ok: true, origin, source: 'allowed_hosts' };
    }
    if (!isProduction) {
      const origin = originFromHost(proto, requestHost);
      if (origin) return { ok: true, origin, source: 'request' };
    }
  }

  return {
    ok: false,
    error: allowed.length > 0 ? 'host_not_allowed' : 'site_url_unpinned',
    message:
      allowed.length > 0
        ? `This request arrived on "${requestHost || 'an unknown host'}", which is not in TENDERBASE_ALLOWED_HOSTS and is not the pinned site URL. Set NEXT_PUBLIC_SITE_URL or add the host.`
        : 'Payments need a pinned public origin: set NEXT_PUBLIC_SITE_URL (or TENDERBASE_ALLOWED_HOSTS) to this deployment host. The request Host header is not trusted, because it becomes the PayFast notify_url.',
  };
}
