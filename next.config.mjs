/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true
  },
  allowedDevOrigins: [
    '192.168.11.74',
    '192.168.1.18',
    '172.16.0.2',
    'localhost',
    '127.0.0.1'
  ]
};

export default nextConfig;
