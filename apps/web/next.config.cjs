/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@kk/shared'],
  async rewrites() {
    const apiUrl = process.env.API_PUBLIC_URL || 'http://localhost:4000';
    // Rewrites to external hosts must live in beforeFiles or fallback so
    // Next's filesystem routing doesn't claim /api/* first.
    return {
      beforeFiles: [
        {
          source: '/api/:path*',
          destination: `${apiUrl}/api/:path*`,
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};
module.exports = nextConfig;
