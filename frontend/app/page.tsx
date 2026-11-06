import type { Metadata } from "next";
import Link from "next/link";
import ChatPage from "./chat/page";

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      name: "TATTVA AI",
      url: "https://tattva-ai-phi.vercel.app/",
      description:
        "An intelligent AI platform for exploring information and improving productivity.",
    },
    {
      "@type": "SiteNavigationElement",
      name: ["Web Image Search", "Satellite Maps", "Live Voice Assistant", "Download App"],
      url: [
        "https://tattva-ai-phi.vercel.app/images",
        "https://tattva-ai-phi.vercel.app/maps",
        "https://tattva-ai-phi.vercel.app/voice",
        "https://tattva-ai-phi.vercel.app/download",
      ],
    },
  ],
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <nav aria-label="Explore TATTVA AI Features" className="sr-only">
        <Link href="/images">TATTVA Web Image Search Engine</Link>
        <Link href="/maps">TATTVA Satellite Maps &amp; Places Explorer</Link>
        <Link href="/voice">TATTVA AI Voice Assistant</Link>
        <Link href="/download">Download TATTVA AI Desktop &amp; Mobile App</Link>
      </nav>
      <ChatPage />
    </>
  );
}
