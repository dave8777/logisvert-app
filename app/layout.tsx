import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Thermopompes murales — Prix de vente",
  description:
    "Prix taxes incluses, subvention LogisVert et prix final pour les thermopompes murales Gree.",
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
