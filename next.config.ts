import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Skip ESLint during builds (warnings from legacy code)
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Ensure TypeScript errors still fail the build
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
