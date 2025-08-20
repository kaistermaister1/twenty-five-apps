/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb'
    }
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.loom.com' },
      { protocol: 'https', hostname: 'www.loom.com' }
    ]
  }
};

export default nextConfig;


