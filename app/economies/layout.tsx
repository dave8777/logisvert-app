import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Calculateur d'économies — Groupe DPSD Inc",
  description:
    "Comparez le coût de votre chauffage actuel à celui d'une thermopompe Gree installée par Groupe DPSD : économies annuelles, retour sur investissement et projection sur 25 ans.",
};

export default function SavingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
