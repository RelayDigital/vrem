/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ucarecdn.com',
      },
      {
        protocol: 'https',
        hostname: 'img.clerk.com',
      },
    ],
  },
  // Skip ESLint during builds (warnings treated as errors in CI)
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Skip TypeScript errors during builds
  typescript: {
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
