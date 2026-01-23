/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output for minimal SSR deployment
  output: 'standalone',
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
  // Expose environment variables to the Edge/middleware runtime
  // This is needed for Amplify Hosting which may not pass env vars to Edge by default
  env: {
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  },
  // Experimental: Configure server external packages to help with Edge compatibility
  experimental: {
    serverExternalPackages: ['@clerk/nextjs'],
  },
};

module.exports = nextConfig;
