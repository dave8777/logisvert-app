import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Estimation en ligne — Groupe DPSD Inc",
  description:
    "Obtenez une fourchette de prix approximative pour votre thermopompe Gree installée par Groupe DPSD Inc.",
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
