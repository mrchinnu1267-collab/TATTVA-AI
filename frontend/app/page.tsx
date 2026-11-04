import type { Metadata } from "next";
import ChatPage from "./chat/page";

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "TATTVA AI",
  url: "https://tattva-ai-phi.vercel.app/",
  description:
    "An intelligent AI platform for exploring information and improving productivity.",
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
      <ChatPage />
    </>
  );
}
