/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['africastalking'],
    staleTimes: {
      dynamic: 0, // Never cache force-dynamic pages in the client router cache
    },
  },
};

export default nextConfig;
