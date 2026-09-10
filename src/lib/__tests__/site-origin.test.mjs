/**
 * The origin we hand PayFast (`lib/site-origin.ts`).
 *
 * `return_url`, `cancel_url` and `notify_url` are built from this and signed
 * into the checkout request, so the interesting property is negative: a Host
 * header must never decide where a payment notification goes. Everything here
 * calls `resolveSiteOrigin` directly with header strings — the pure half of the
 * module, which is why that module exists on its own: the module that consumes
 * it also pulls in Supabase and `next/headers`, which no test outside Next can
 * import.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { originFromHost, resolveSiteOrigin } from '@/lib/site-origin';

const PROD = { isProduction: true };
const DEV = { isProduction: false };

test('a pinned site URL wins outright, whatever the request claimed', () => {
  const out = resolveSiteOrigin({
    ...PROD,
    siteUrl: 'https://tenderbase.app',
    forwardedHost: 'evil.example',
    host: 'evil.example',
  });
  assert.equal(out.ok, true);
  assert.equal(out.origin, 'https://tenderbase.app');
  assert.equal(out.source, 'site_url', 'provenance: configuration, not the caller');
});

test('a pinned value is normalised, not pasted through', () => {
  for (const raw of ['https://tenderbase.app/', '  https://tenderbase.app  ', 'tenderbase.app']) {
    const out = resolveSiteOrigin({ ...PROD, siteUrl: raw, host: 'evil.example' });
    assert.equal(out.ok && out.origin, 'https://tenderbase.app', `${raw} lands on one origin`);
  }
  const broken = resolveSiteOrigin({ ...PROD, siteUrl: 'not a url at all', host: 'good.example' });
  assert.equal(broken.ok, false);
  assert.equal(broken.error, 'site_url_unpinned', 'a broken pin is reported, not quietly ignored');
});

test('in production an unlisted host gets no origin at all', () => {
  const out = resolveSiteOrigin({ ...PROD, host: 'evil.example', forwardedHost: 'evil.example' });
  assert.equal(out.ok, false);
  assert.equal(out.error, 'site_url_unpinned');
  assert.match(out.message, /notify_url/, 'the message says why the Host header is not trusted');

  const allowlisted = resolveSiteOrigin({
    ...PROD,
    allowedHosts: 'tenderbase.app,preview.tenderbase.app',
    host: 'evil.example',
  });
  assert.equal(allowlisted.ok, false);
  assert.equal(allowlisted.error, 'host_not_allowed', 'there is an allowlist and this is not on it');
});

test('an allowlisted host is honoured, with the scheme the proxy reported', () => {
  const out = resolveSiteOrigin({
    ...PROD,
    allowedHosts: 'preview.tenderbase.app',
    forwardedHost: 'preview.tenderbase.app',
    host: '10.0.0.7:3000',
    forwardedProto: 'https',
  });
  assert.equal(out.ok, true);
  assert.equal(out.origin, 'https://preview.tenderbase.app');
  assert.equal(out.source, 'allowed_hosts');

  const http = resolveSiteOrigin({
    ...PROD,
    allowedHosts: 'preview.tenderbase.app',
    host: 'preview.tenderbase.app',
    forwardedProto: 'http',
  });
  assert.equal(http.origin, 'http://preview.tenderbase.app', 'an http pin is not silently upgraded');

  const configuredAsUrl = resolveSiteOrigin({
    ...PROD,
    allowedHosts: 'https://preview.tenderbase.app/',
    host: 'preview.tenderbase.app',
  });
  assert.equal(configuredAsUrl.ok, true, 'entries may be typed as origins or bare hosts');
});

test('a Host header cannot smuggle characters into the origin', () => {
  const smuggled = ['evil.example/#@tenderbase.app', 'evil.example/?x=', 'user:pw@tenderbase.app', 'evil.example\r\nX-Forwarded: 1'];
  const lookalikes = ['tenderbase.app.evil.example', 'eviltenderbase.app', 'evil.example'];
  for (const host of [...smuggled, ...lookalikes]) {
    const out = resolveSiteOrigin({
      ...PROD,
      allowedHosts: 'tenderbase.app',
      forwardedHost: host,
      host,
    });
    assert.equal(out.ok, false, `${JSON.stringify(host)} never becomes an origin`);
  }
  // The smuggled ones are not even well-formed hosts; the lookalikes are valid
  // host names that must fail on the allowlist instead.
  for (const host of smuggled) {
    assert.equal(originFromHost('https', host), null, `${JSON.stringify(host)} is not a well-formed host`);
  }
});

test('only the first value of a chained forwarding header is used', () => {
  const out = resolveSiteOrigin({
    ...PROD,
    allowedHosts: 'tenderbase.app',
    forwardedHost: 'tenderbase.app, evil.example',
  });
  assert.equal(out.origin, 'https://tenderbase.app');
});

test('outside production the request host is accepted, so previews need no setup', () => {
  const out = resolveSiteOrigin({ ...DEV, host: '3000-preview.e2b.app', forwardedProto: 'https' });
  assert.equal(out.ok, true);
  assert.equal(out.origin, 'https://3000-preview.e2b.app');
  assert.equal(out.source, 'request');

  const ported = resolveSiteOrigin({ ...DEV, host: 'localhost:3000', forwardedProto: 'http' });
  assert.equal(ported.origin, 'http://localhost:3000');
});

test('even outside production, a pinned URL outranks the request', () => {
  const out = resolveSiteOrigin({ ...DEV, siteUrl: 'https://tenderbase.app', host: 'localhost:3000' });
  assert.equal(out.origin, 'https://tenderbase.app');
});

test('a request with no host header at all fails closed', () => {
  for (const isProduction of [true, false]) {
    const out = resolveSiteOrigin({ isProduction, forwardedHost: '', host: '' });
    assert.equal(out.ok, false);
  }
});

test('a pin without a scheme means https, and the request does not get a vote', () => {
  for (const forwardedProto of ['http', 'https', 'gopher']) {
    const out = resolveSiteOrigin({
      ...PROD,
      siteUrl: 'tenderbase.app',
      forwardedProto,
      forwardedHost: 'evil.example',
    });
    assert.equal(out.origin, 'https://tenderbase.app', `${forwardedProto} does not downgrade a pinned origin`);
  }
  const deliberate = resolveSiteOrigin({ ...PROD, siteUrl: 'http://tunnel.local:9911', forwardedProto: 'https' });
  assert.equal(deliberate.origin, 'http://tunnel.local:9911', 'an explicit http pin is kept for tunnels');
});
