import type { Metadata } from "next";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Suspense } from "react";

const ChatPage = dynamic(() => import("./chat/page"), {
  ssr: true,
  loading: () => (
    <div className="flex h-screen w-full items-center justify-center bg-[#0d0e11] text-white">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        <span className="text-sm font-medium text-neutral-400">Loading TATTVA AI...</span>
      </div>
    </div>
  ),
});

export const metadata: Metadata = {
  title: "TATTVA AI – Your Intelligent AI Assistant",
  description:
    "Discover TATTVA AI, your intelligent AI platform for reasoning, real-time live voice conversations, interactive satellite maps, and real web image search.",
  alternates: {
    canonical: "https://tattva-ai-phi.vercel.app/",
  },
  openGraph: {
    title: "TATTVA AI – Your Intelligent AI Assistant",
    description:
      "Discover TATTVA AI, your intelligent AI platform for reasoning, real-time live voice conversations, interactive satellite maps, and real web image search.",
    url: "https://tattva-ai-phi.vercel.app/",
    siteName: "TATTVA AI",
    type: "website",
    images: [
      {
        url: "/logo.png",
        width: 512,
        height: 512,
        alt: "TATTVA AI Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TATTVA AI – Your Intelligent AI Assistant",
    description:
      "Discover TATTVA AI, your intelligent AI platform for reasoning, real-time live voice conversations, interactive satellite maps, and real web image search.",
    images: ["/logo.png"],
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://tattva-ai-phi.vercel.app/#website",
      url: "https://tattva-ai-phi.vercel.app/",
      name: "TATTVA AI",
      description:
        "An intelligent AI platform for reasoning, real-time voice, satellite maps, and real web image search.",
      publisher: {
        "@id": "https://tattva-ai-phi.vercel.app/#organization",
      },
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: "https://tattva-ai-phi.vercel.app/images?q={search_term_string}",
        },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "Organization",
      "@id": "https://tattva-ai-phi.vercel.app/#organization",
      name: "TATTVA AI",
      url: "https://tattva-ai-phi.vercel.app/",
      logo: {
        "@type": "ImageObject",
        url: "https://tattva-ai-phi.vercel.app/logo.png",
        width: 512,
        height: 512,
      },
      founder: {
        "@type": "Person",
        name: "kotapati Gowtham Chowdary",
      },
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

      {/* Semantic Crawlable Content for Search Engines & Accessibility */}
      <section className="sr-only" aria-label="TATTVA AI Platform Overview">
        <h1>TATTVA AI – Your Intelligent AI Assistant, Web Search &amp; Creative Studio</h1>
        <p>
          TATTVA AI is an intelligent, privacy-first artificial intelligence workspace engineered to
          deliver deep cognitive reasoning, real-time multilingual voice conversations, interactive
          satellite mapping, real web photograph search, and multi-format document generation.
        </p>

        <h2>Core Platform Capabilities</h2>
        <article>
          <h3>AI Chat Assistant &amp; Reasoning</h3>
          <p>
            Engage in high-precision conversations powered by multi-provider intelligence, step-by-step
            reasoning decomposition, Claude Model Context Protocol (MCP) tool integrations, and real-time clock grounding.
          </p>
          <Link href="/chat">Access AI Chat Assistant</Link>
        </article>

        <article>
          <h3>Web Image Search Engine</h3>
          <p>
            Explore real photographs from across the web without artificial substitutions, aggregating
            millions of high-resolution visual assets from Wikimedia Commons and Openverse with verified licensing.
          </p>
          <Link href="/images">Open Web Image Search Engine</Link>
        </article>

        <article>
          <h3>Interactive Satellite Maps &amp; Explorer</h3>
          <p>
            Navigate global high-resolution satellite imagery, discover nearby places, cafes, parks, and
            hotels with live GPS coordinates, ratings, and instant routes.
          </p>
          <Link href="/maps">Explore Satellite Maps</Link>
        </article>

        <article>
          <h3>Live Voice Assistant</h3>
          <p>
            Speak naturally with ultra-low latency bidirectional audio conversations in multiple languages
            with hands-free voice interactions.
          </p>
          <Link href="/voice">Start Live Voice Conversation</Link>
        </article>

        <article>
          <h3>AI Media &amp; Document Generation</h3>
          <p>
            Create formatted PDF reports, Word documents, PowerPoint presentations, and Excel spreadsheets
            directly with AI assistance.
          </p>
          <Link href="/media">Open AI Document Studio</Link>
        </article>

        <article>
          <h3>Download TATTVA AI Mobile App</h3>
          <p>
            Install the official Android application package (APK) for on-the-go voice assistance, mapping,
            and artificial intelligence.
          </p>
          <Link href="/download">Download TATTVA AI for Android</Link>
        </article>
      </section>

      <Suspense
        fallback={
          <div className="flex h-screen w-full items-center justify-center bg-[#0d0e11] text-white">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
              <span className="text-sm font-medium text-neutral-400">Loading TATTVA AI...</span>
            </div>
          </div>
        }
      >
        <ChatPage />
      </Suspense>
    </>
  );
}
