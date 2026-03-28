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
  title: "Budget Cozy Bedroom Stylist",
  description: "Transform your bedroom with affordable, curated styling suggestions",
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
      <body className="min-h-screen flex flex-col relative">
        {/* Subtle dot-pattern texture overlay */}
        <div
          className="fixed inset-0 -z-10 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(circle, #2C1810 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        {children}
      </body>
    </html>
  );
}
