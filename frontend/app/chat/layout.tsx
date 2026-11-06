import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://tattva-ai-phi.vercel.app"),
  title: "AI Chat Assistant – Intelligent Conversations | TATTVA AI",
  description:
    "Engage in intelligent AI conversations with TATTVA AI. Experience fast reasoning, multimodal document analysis, Claude MCP connectors, and live clock.",
  alternates: {
    canonical: "https://tattva-ai-phi.vercel.app/chat",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "AI Chat Assistant – Intelligent Conversations | TATTVA AI",
    description:
      "Engage in intelligent AI conversations with TATTVA AI. Experience fast reasoning, multimodal document analysis, Claude MCP connectors, and live clock.",
    url: "https://tattva-ai-phi.vercel.app/chat",
    siteName: "TATTVA AI",
    type: "website",
    images: [
      {
        url: "/logo.png",
        width: 512,
        height: 512,
        alt: "TATTVA AI Chat Assistant",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Chat Assistant – Intelligent Conversations | TATTVA AI",
    description:
      "Engage in intelligent AI conversations with TATTVA AI. Experience fast reasoning, multimodal document analysis, Claude MCP connectors, and live clock.",
    images: ["/logo.png"],
  },
};

const chatStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: "TATTVA AI Chat Assistant",
      url: "https://tattva-ai-phi.vercel.app/chat",
      applicationCategory: "CommunicationApplication",
      operatingSystem: "All",
      description:
        "Engage in intelligent AI conversations with TATTVA AI. Experience fast reasoning, multimodal document analysis, Claude MCP connectors, and live clock.",
      browserRequirements: "Requires JavaScript. Requires HTML5.",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      author: {
        "@type": "Person",
        name: "kotapati Gowtham Chowdary",
      },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: "https://tattva-ai-phi.vercel.app",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "AI Chat",
          item: "https://tattva-ai-phi.vercel.app/chat",
        },
      ],
    },
  ],
};

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(chatStructuredData).replace(/</g, "\\u003c"),
        }}
      />
      {children}
    </>
  );
}

