import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "PitchPath | College Soccer Fit",
  description:
    "College soccer matching for players comparing NCAA programs by academics, playing level, division, region, and program availability.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#236b4b",
          colorText: "#17201b",
          colorTextSecondary: "#647067",
          colorBackground: "#ffffff",
          colorInputBackground: "#ffffff",
          colorInputText: "#17201b",
          borderRadius: "6px",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif',
        },
      }}
    >
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
