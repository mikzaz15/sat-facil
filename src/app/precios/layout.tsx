import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Precios SAT Fácil | Planes para validar CFDI",
  description:
    "Compara el plan Gratis y Pro de SAT Fácil para validar CFDI, detectar errores SAT y trabajar con validación en lote.",
};

export default function PreciosLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
