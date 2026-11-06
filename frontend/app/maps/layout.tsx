import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://tattva-ai-phi.vercel.app"),
  title: "Live Satellite Maps & Places Explorer | TATTVA AI",
  description:
    "Explore high-resolution satellite imagery, discover nearby places, cafes, parks, and view real-time ratings and directions on TATTVA AI Satellite Maps.",
  alternates: {
    canonical: "https://tattva-ai-phi.vercel.app/maps",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Live Satellite Maps & Places Explorer | TATTVA AI",
    description:
      "Explore high-resolution satellite imagery, discover nearby places, cafes, parks, and view real-time ratings and directions on TATTVA AI Satellite Maps.",
    url: "https://tattva-ai-phi.vercel.app/maps",
    siteName: "TATTVA AI",
    type: "website",
    images: [
      {
        url: "/logo.png",
        width: 512,
        height: 512,
        alt: "TATTVA AI Satellite Maps",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Live Satellite Maps & Places Explorer | TATTVA AI",
    description:
      "Explore high-resolution satellite imagery, discover nearby places, cafes, parks, and view real-time ratings and directions on TATTVA AI Satellite Maps.",
    images: ["/logo.png"],
  },
};

const mapsStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: "TATTVA Satellite Maps & Places Explorer",
      url: "https://tattva-ai-phi.vercel.app/maps",
      applicationCategory: "MapsAndNavigationApplication",
      operatingSystem: "All",
      description:
        "Explore high-resolution satellite imagery, discover nearby places, cafes, parks, and view real-time ratings and directions on TATTVA AI Satellite Maps.",
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
          name: "Satellite Maps",
          item: "https://tattva-ai-phi.vercel.app/maps",
        },
      ],
    },
  ],
};

export default function MapsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(mapsStructuredData).replace(/</g, "\\u003c"),
        }}
      />
      {children}
    </>
  );
}
