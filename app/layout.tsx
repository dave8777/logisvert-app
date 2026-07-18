import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Heat Pumps — Sales Pricing",
  description:
    "Tax-included prices, LogisVert subsidy and final price for Gree wall-mounted and multi-zone heat pumps.",
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
