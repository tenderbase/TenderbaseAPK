/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow the Arena e2b preview host to load /_next/* dev assets.
  allowedDevOrigins: ['*.e2b.app'],
  // Capacitor: uncomment for static Android builds
  // output: 'export',
  // images: { unoptimized: true },
};
export default nextConfig;
