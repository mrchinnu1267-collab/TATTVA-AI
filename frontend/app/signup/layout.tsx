import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Account | TATTVA AI",
  description: "Create your free TATTVA AI account.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

