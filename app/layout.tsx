import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ViralScript AI — 글로벌 숏폼 바이럴 대본 생성기",
  description:
    "TikTok, YouTube Shorts, Instagram Reels의 바이럴 구조를 분석하여 미국·한국·일본 3개국 최적화 마케팅 대본을 AI로 즉시 생성합니다.",
  keywords: ["AI", "바이럴", "숏폼", "TikTok", "YouTube Shorts", "Instagram Reels", "마케팅", "대본"],
  authors: [{ name: "ViralScript AI" }],
  openGraph: {
    title: "ViralScript AI",
    description: "AI로 3개국 바이럴 대본을 즉시 생성",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#050508",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col mesh-bg">{children}</body>
    </html>
  );
}
