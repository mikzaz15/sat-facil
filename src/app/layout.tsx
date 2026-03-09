import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";

import "./globals.css";

export const metadata: Metadata = {
  title: "SAT Fácil",
  description: "Asistente educativo para trámites SAT.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <Navbar />
        {children}
      </body>
    </html>
  );
}
