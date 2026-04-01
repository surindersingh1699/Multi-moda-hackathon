import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import PostHogProvider from "@/components/PostHogProvider";
import ErrorBoundary from "@/components/ErrorBoundary";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Roomify — AI Room Stylist on a Real Budget",
  description:
    "Upload a room photo. Get a designer makeover plan with real, shoppable products from Amazon, Target & IKEA — all under your budget. Powered by GPT-4o Vision.",
  keywords: [
    "AI interior design",
    "room makeover",
    "budget room styling",
    "GPT-4o",
    "AI room stylist",
  ],
  authors: [{ name: "Roomify Team" }],
  openGraph: {
    title: "Roomify — AI Room Stylist",
    description:
      "Snap your room. Get a designer makeover plan in 30 seconds. Real products. Real prices. Real links.",
    type: "website",
    siteName: "Roomify",
  },
  twitter: {
    card: "summary_large_image",
    title: "Roomify — AI Room Stylist",
    description:
      "Upload a photo. Your AI interior designer does the rest.",
  },
  other: {
    "theme-color": "#FDF8F4",
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
      <body className="min-h-screen flex flex-col relative" suppressHydrationWarning>
        <ErrorBoundary>
          <AuthProvider>
            <PostHogProvider>
              {children}
            </PostHogProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
