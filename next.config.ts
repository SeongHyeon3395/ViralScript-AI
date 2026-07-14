import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 외부 이미지 도메인 허용 (필요 시 추가)
  images: {
    remotePatterns: [],
  },

  // 서버리스 함수 타임아웃 (Vercel Pro: 최대 60초)
  serverExternalPackages: ['@google/genai', 'axios'],

  // 엄격 모드
  reactStrictMode: true,
};

export default nextConfig;
