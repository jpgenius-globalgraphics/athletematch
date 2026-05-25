import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AthleteMatch | College Soccer Fit",
  description: "College soccer matching for players comparing NCAA programs by academics, playing level, division, region, and program availability.",
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
