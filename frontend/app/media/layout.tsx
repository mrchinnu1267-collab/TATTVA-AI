import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Media Tools and Creative Studio | TATTVA AI",
  description:
    "Create, convert, and export professional documents in PDF, Word, PowerPoint, Excel, and CSV formats with AI-assisted formatting on TATTVA AI Media Studio.",
  alternates: {
    canonical: "https://tattva-ai-phi.vercel.app/media",
  },
  openGraph: {
    title: "AI Media Tools and Creative Studio | TATTVA AI",
    description:
      "Create, convert, and export professional documents in PDF, Word, PowerPoint, Excel, and CSV formats with AI-assisted formatting on TATTVA AI Media Studio.",
    url: "https://tattva-ai-phi.vercel.app/media",
    siteName: "TATTVA AI",
    type: "website",
    images: [
      {
        url: "https://tattva-ai-phi.vercel.app/og-image.png",
        width: 1200,
        height: 630,
        alt: "TATTVA AI Media Tools and Creative Studio",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Media Tools and Creative Studio | TATTVA AI",
    description:
      "Create, convert, and export professional documents in PDF, Word, PowerPoint, Excel, and CSV formats with AI-assisted formatting on TATTVA AI Media Studio.",
    images: ["https://tattva-ai-phi.vercel.app/og-image.png"],
  },
};

export default function MediaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "@id": "https://tattva-ai-phi.vercel.app/media#app",
        name: "TATTVA AI Media Tools & Creative Studio",
        url: "https://tattva-ai-phi.vercel.app/media",
        applicationCategory: "MultimediaApplication",
        operatingSystem: "All",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
        description:
          "AI-powered document generator and converter supporting PDF, DOCX, PPTX, XLSX, and CSV formats with real-time formatting.",
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: "https://tattva-ai-phi.vercel.app/",
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Media Studio",
            item: "https://tattva-ai-phi.vercel.app/media",
          },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </>
  );
}

