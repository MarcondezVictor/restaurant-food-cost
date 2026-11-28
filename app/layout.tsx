import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { COLORS } from "@/components/ui/tokens";
import "./globals.css";

// Self-hosted by Next.js at build time: no request to Google from the phone.
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Custo da comida",
};

export const viewport: Viewport = {
  themeColor: COLORS.bg,
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="min-h-dvh bg-bg font-sans text-body text-fg antialiased">
        {children}
      </body>
    </html>
  );
}
