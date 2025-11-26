import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "4-Spors Kassettoptaker",
  description: "En autentisk 4-spors kassettoptaker simulator",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="no">
      <body>{children}</body>
    </html>
  );
}
