import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [],
  },
  serverExternalPackages: ['@google/genai', 'axios'],
  reactStrictMode: true,
  devIndicators: false,
};

export default nextConfig;
