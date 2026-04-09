/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/finage/:path*',
        destination: 'https://api.finage.co.uk/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
