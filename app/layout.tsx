import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Groupe DPSD — Heat Pump Sales Pricing",
  description:
    "Groupe DPSD: tax-included prices, LogisVert subsidy and final price for Gree wall-mounted and multi-zone heat pumps.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
