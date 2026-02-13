import type { Metadata } from "next";
import { Manrope, JetBrains_Mono } from "next/font/google";

import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Elloi Kasa",
  description: "Kasiyer sipariş ve rapor uygulaması",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className={`${manrope.variable} ${jetbrainsMono.variable} bg-app text-slate-900 antialiased`}>
        {children}
      </body>
    </html>
  );
}
