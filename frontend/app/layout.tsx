import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Waste-to-Carbon Value Chain Tracker",
  description:
    "Connects waste generators with carbon-conversion facilities: predicts waste availability, " +
    "matches it to suitable facilities, optimizes collection routes, and estimates CO2 impact.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
