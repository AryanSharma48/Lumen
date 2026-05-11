import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lumen | The AI Spend Audit Engine for High-Growth Teams",
  description: "Analyze your team's AI tool spend, identify overlaps, and find verifiable savings across ChatGPT, Claude, Cursor, and more in under 2 minutes.",
  openGraph: {
    title: "Lumen | The AI Spend Audit Engine for High-Growth Teams",
    description: "Analyze your team's AI tool spend, identify overlaps, and find verifiable savings across ChatGPT, Claude, Cursor, and more in under 2 minutes.",
    url: "https://lumenaudit.vercel.app",
    siteName: "Lumen",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Lumen AI Spend Audit",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Lumen | The AI Spend Audit Engine for High-Growth Teams",
    description: "Analyze your team's AI tool spend, identify overlaps, and find verifiable savings across ChatGPT, Claude, Cursor, and more in under 2 minutes.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>{children}</body>
    </html>
  );
}
