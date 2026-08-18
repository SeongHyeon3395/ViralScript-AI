import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import ToastHost from "./components/ToastHost";
import { AuthProvider } from "./components/AuthProvider";
import { ThemeProvider } from "./components/ThemeProvider";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://viralscript-ai-inky.vercel.app";

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
  metadataBase: new URL(siteUrl),
  title: "ViralScript AI — 글로벌 숏폼 바이럴 대본 생성기",
  description:
    "TikTok과 YouTube Shorts의 바이럴 구조를 분석하여 미국·한국·일본 3개국 최적화 마케팅 대본을 AI로 즉시 생성합니다.",
  keywords: ["AI", "바이럴", "숏폼", "TikTok", "YouTube Shorts", "마케팅", "대본"],
  authors: [{ name: "ViralScript AI" }],
  openGraph: {
    title: "ViralScript AI — 글로벌 숏폼 바이럴 대본 생성기",
    description: "TikTok과 YouTube Shorts의 바이럴 구조를 분석하고 US·KR·JP 대본을 즉시 생성하세요.",
    type: "website",
    locale: "ko_KR",
    siteName: "ViralScript AI",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "ViralScript AI 글로벌 숏폼 바이럴 대본 생성기",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ViralScript AI — 글로벌 숏폼 바이럴 대본 생성기",
    description: "AI로 US·KR·JP 숏폼 마케팅 대본을 즉시 생성",
    images: ["/og-image.svg"],
  },
};

export const viewport: Viewport = {
  themeColor: "#f8fafc",
  colorScheme: "light",
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
      <body className="min-h-screen flex flex-col mesh-bg">
        <AuthProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </AuthProvider>
        <ToastHost />
      </body>
    </html>
  );
}
