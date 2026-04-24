import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHost = supabaseUrl ? new URL(supabaseUrl).hostname : undefined;

const nextConfig: NextConfig = {
  serverExternalPackages: ['yahoo-finance2'],
  images: {
    remotePatterns: [
      ...(supabaseHost
        ? [{ protocol: 'https' as const, hostname: supabaseHost, pathname: '/storage/v1/object/**' }]
        : []),
      { protocol: 'https', hostname: 'assets.coingecko.com' },
      { protocol: 'https', hostname: 'www.google.com', pathname: '/s2/favicons' },
    ],
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'lightweight-charts', 'zustand'],
  },
};

export default nextConfig;
