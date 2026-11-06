import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In | TATTVA AI",
  description: "Sign in to your TATTVA AI account.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

