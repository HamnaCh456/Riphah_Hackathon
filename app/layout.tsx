import type { Metadata, Viewport } from "next";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Talent Intelligence", template: "%s | Talent Intelligence" },
  description:
    "Recruitment with explainable AI recommendations and human decisions.",
};

export const viewport: Viewport = { themeColor: "#0b2545" };

const dmSans = DM_Sans({
  variable: "--font-matter",
  weight: ["400", "500", "600"],
  display: "swap",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  weight: ["400", "500"],
  display: "swap",
  subsets: ["latin"],
});

import { ToastProvider } from "@/components/ui/toast";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${jetbrainsMono.variable}`}>
      <body className="antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
