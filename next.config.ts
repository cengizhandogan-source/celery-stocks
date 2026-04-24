import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['yahoo-finance2'],
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'lightweight-charts', 'zustand'],
  },
};

export default nextConfig;
