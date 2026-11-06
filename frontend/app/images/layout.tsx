import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://tattva-ai-phi.vercel.app"),
  title: "AI Image Studio – Generate AI Images | TATTVA AI",
  description:
    "Search millions of real photographs from the internet with TATTVA AI Image Search Engine. Fast, free access to Wikimedia Commons and Openverse photography.",
  alternates: {
    canonical: "https://tattva-ai-phi.vercel.app/images",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "AI Image Studio – Generate AI Images | TATTVA AI",
    description:
      "Search millions of real photographs from the internet with TATTVA AI Image Search Engine. Fast, free access to Wikimedia Commons and Openverse photography.",
    url: "https://tattva-ai-phi.vercel.app/images",
    siteName: "TATTVA AI",
    type: "website",
    images: [
      {
        url: "/logo.png",
        width: 512,
        height: 512,
        alt: "TATTVA AI Web Image Search Engine",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Image Studio – Generate AI Images | TATTVA AI",
    description:
      "Search millions of real photographs from the internet with TATTVA AI Image Search Engine. Fast, free access to Wikimedia Commons and Openverse photography.",
    images: ["/logo.png"],
  },
};

const imagesStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: "TATTVA AI Web Image Search Engine",
      url: "https://tattva-ai-phi.vercel.app/images",
      applicationCategory: "MultimediaApplication",
      operatingSystem: "All",
      description:
        "Search millions of real photographs from the internet with TATTVA AI Image Search Engine. Fast, free access to Wikimedia Commons and Openverse photography.",
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
          name: "Images",
          item: "https://tattva-ai-phi.vercel.app/images",
        },
      ],
    },
  ],
};

export default function ImagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(imagesStructuredData).replace(/</g, "\\u003c"),
        }}
      />
      {children}
    </>
  );
}

