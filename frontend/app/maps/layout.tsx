import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://tattva-ai-phi.vercel.app"),
  title: "Live Satellite Maps & Places Explorer",
  description:
    "Explore real-time high-resolution satellite imagery, discover nearby places, hotels, cafes, parks, and view ratings and directions on TATTVA AI.",
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
      "Explore real-time high-resolution satellite imagery, discover nearby places, hotels, cafes, parks, and view ratings on TATTVA AI.",
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
      "Explore real-time high-resolution satellite imagery, discover nearby places, hotels, cafes, parks, and view ratings.",
    images: ["/logo.png"],
  },
};

export default function MapsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

