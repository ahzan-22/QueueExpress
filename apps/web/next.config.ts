import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // packages/shared sudah berupa build CommonJS, jadi tidak perlu transpile.
  transpilePackages: ['@queueexpress/shared'],
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
};

export default nextConfig;