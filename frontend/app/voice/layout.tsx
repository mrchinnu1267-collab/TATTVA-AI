import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://tattva-ai-phi.vercel.app"),
  title: "TATTVA AI Voice Assistant – Real-Time Voice Conversation",
  description:
    "Experience ultra-low latency real-time voice conversations with TATTVA AI Voice Assistant. Speak naturally in multiple languages with fluent audio responses.",
  alternates: {
    canonical: "https://tattva-ai-phi.vercel.app/voice",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "TATTVA AI Voice Assistant | Real-Time Live Voice",
    description:
      "Experience ultra-low latency real-time voice conversations with TATTVA AI Voice Assistant. Speak naturally in multiple languages.",
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
    title: "TATTVA AI Voice Assistant | Real-Time Live Voice",
    description:
      "Experience ultra-low latency real-time voice conversations with TATTVA AI Voice Assistant.",
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
        "Experience ultra-low latency real-time voice conversations with TATTVA AI Voice Assistant. Speak naturally in multiple languages with fluent audio responses.",
      browserRequirements: "Requires WebRTC. Requires Microphone Access.",
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
