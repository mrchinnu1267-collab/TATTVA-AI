import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Account | TATTVA AI",
  robots: {
    index: false,
    follow: false,
  },
};

export default function CreateAccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

