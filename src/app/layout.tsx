import type { Metadata } from "next";
import { Manrope, DM_Mono } from "next/font/google";
import "./globals.css";
import { CookieBanner } from "@/components/CookieBanner";

// Manrope para títulos y wordmark (ExtraBold 800); DM Mono para datos, horas e IDs.
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
  display: "swap",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.fichalium.es"),
  title: "Fichalium · Control horario",
  description:
    "Fichalium: registro de jornada laboral para empresas en España. Cada empresa, sus datos aislados.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${manrope.variable} ${dmMono.variable}`}>
      <body className="min-h-screen bg-offwhite text-navy antialiased">
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
