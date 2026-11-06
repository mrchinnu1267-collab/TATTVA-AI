import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Media Tools and Creative Studio | TATTVA AI",
  alternates: {
    canonical: "https://tattva-ai-phi.vercel.app/media",
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function FilesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

