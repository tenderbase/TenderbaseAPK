/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow the Arena e2b preview host to load /_next/* dev assets.
  allowedDevOrigins: ['*.e2b.app'],
  // Next 14: the instrumentation hook (src/instrumentation.ts — the tender API
  // keep-alive) needs this flag; stable (no flag) from Next 15.
  experimental: {
    instrumentationHook: true,
  },
  // Capacitor: uncomment for static Android builds
  // output: 'export',
  // images: { unoptimized: true },
};
export default nextConfig;
