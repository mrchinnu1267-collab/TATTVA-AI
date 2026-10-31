import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TATTVA AI | Sign In",
  description:
    "Sign in to TATTVA AI to compare AI models and explore stronger answers."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}