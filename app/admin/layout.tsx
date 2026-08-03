import type { Metadata } from "next";

// Le tableau de bord des demandes ne doit jamais apparaître dans les
// résultats de recherche (il est aussi exclu via robots.txt).
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
