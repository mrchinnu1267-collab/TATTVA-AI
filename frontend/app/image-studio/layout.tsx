import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://tattva-ai-phi.vercel.app"),
  title: "AI Image Studio – Generate AI Images | TATTVA AI",
  description:
    "Generate photorealistic AI images with verified prompt adherence, automatic vision quality checks, and multi-model diffusion rendering on TATTVA AI.",
  alternates: {
    canonical: "https://tattva-ai-phi.vercel.app/image-studio",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "AI Image Studio – Generate AI Images | TATTVA AI",
    description:
      "Generate photorealistic AI images with verified prompt adherence, automatic vision quality checks, and multi-model diffusion rendering on TATTVA AI.",
    url: "https://tattva-ai-phi.vercel.app/image-studio",
    siteName: "TATTVA AI",
    type: "website",
    images: [
      {
        url: "/logo.png",
        width: 512,
        height: 512,
        alt: "TATTVA AI Image Studio",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Image Studio – Generate AI Images | TATTVA AI",
    description:
      "Generate photorealistic AI images with verified prompt adherence, automatic vision quality checks, and multi-model diffusion rendering on TATTVA AI.",
    images: ["/logo.png"],
  },
};

const imageStudioStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: "TATTVA AI Image Studio",
      url: "https://tattva-ai-phi.vercel.app/image-studio",
      applicationCategory: "DesignApplication",
      operatingSystem: "All",
      description:
        "Generate photorealistic AI images with verified prompt adherence, automatic vision quality checks, and multi-model diffusion rendering on TATTVA AI.",
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
          name: "Image Studio",
          item: "https://tattva-ai-phi.vercel.app/image-studio",
        },
      ],
    },
  ],
};

export default function ImageStudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(imageStudioStructuredData).replace(/</g, "\\u003c"),
        }}
      />
      {children}
    </>
  );
}

