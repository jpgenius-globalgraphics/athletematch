import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AthleteMatch - Find Your Perfect College",
  description: "AI-powered college recruiting platform for athletes. Find schools that match your academic and athletic profile.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-black text-white">{children}</body>
    </html>
  );
}