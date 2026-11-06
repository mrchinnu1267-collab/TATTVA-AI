import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://tattva-ai-phi.vercel.app"),
  title: "AI Voice Assistant – Real-Time Voice Conversations | TATTVA AI",
  description:
    "Experience ultra-low latency real-time voice conversations with TATTVA AI Voice Assistant. Speak naturally in multiple languages with fluent voice responses.",
  alternates: {
    canonical: "https://tattva-ai-phi.vercel.app/voice",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "AI Voice Assistant – Real-Time Voice Conversations | TATTVA AI",
    description:
      "Experience ultra-low latency real-time voice conversations with TATTVA AI Voice Assistant. Speak naturally in multiple languages with fluent voice responses.",
    url: "https://tattva-ai-phi.vercel.app/voice",
    siteName: "TATTVA AI",
    type: "website",
    images: [
      {
        url: "/logo.png",
        width: 512,
        height: 512,
        alt: "TATTVA AI Voice Assistant",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Voice Assistant – Real-Time Voice Conversations | TATTVA AI",
    description:
      "Experience ultra-low latency real-time voice conversations with TATTVA AI Voice Assistant. Speak naturally in multiple languages with fluent voice responses.",
    images: ["/logo.png"],
  },
};

const voiceStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: "TATTVA AI Voice Assistant",
      url: "https://tattva-ai-phi.vercel.app/voice",
      applicationCategory: "MultimediaApplication",
      operatingSystem: "All",
      description:
        "Experience ultra-low latency real-time voice conversations with TATTVA AI Voice Assistant. Speak naturally in multiple languages with fluent voice responses.",
      browserRequirements: "Requires WebRTC. Requires Microphone Access.",
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
          name: "Voice Assistant",
          item: "https://tattva-ai-phi.vercel.app/voice",
        },
      ],
    },
  ],
};

export default function VoiceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(voiceStructuredData).replace(/</g, "\\u003c"),
        }}
      />
      {children}
    </>
  );
}
