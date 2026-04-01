import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Control de Postres",
  description: "Sistema de gestión de inventario de postres",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-gray-50 min-h-screen">{children}</body>
    </html>
  );
}
