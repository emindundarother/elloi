import type { Metadata } from "next";

import "./globals.css";

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
      <body className="bg-app text-slate-900 antialiased">{children}</body>
    </html>
  );
}
