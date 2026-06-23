import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fichaje · Control horario",
  description: "SaaS de registro de jornada laboral para empresas en España",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
