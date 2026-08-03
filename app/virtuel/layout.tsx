import type { Metadata } from "next";

// Lien envoyé directement aux clients — pas destiné aux résultats de recherche.
export const metadata: Metadata = {
  title: "Estimation virtuelle — Groupe DPSD Inc",
  description:
    "Envoyez vos photos, choisissez un créneau et rencontrez-nous virtuellement pour votre estimation de thermopompe.",
  robots: { index: false, follow: false },
};

export default function VirtualLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
