import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { COLORS } from "@/components/ui/tokens";
import "./globals.css";

// Inter from the @fontsource-variable/inter package, latin subset only (it
// covers Portuguese accents). The build reads it from node_modules, so it
// needs no network; the phone downloads it from our own server.
const inter = localFont({
  src: "../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2",
  weight: "100 900",
  style: "normal",
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
