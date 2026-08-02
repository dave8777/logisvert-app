import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Calculateur de subvention LogisVert — Groupe DPSD Inc",
  description:
    "Estimez la subvention LogisVert pour votre thermopompe Gree installée par Groupe DPSD Inc.",
  icons: { icon: "/favicon.png" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
