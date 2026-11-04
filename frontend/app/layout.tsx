import type { Metadata, Viewport } from "next";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import PWAProvider from "./components/PWAProvider";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0e11" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL("https://tattva-ai-phi.vercel.app"),

  title: {
    default: "TATTVA AI – Your Intelligent AI Assistant",
    template: "%s | TATTVA AI",
  },

  description:
    "Discover TATTVA AI, an intelligent AI platform designed to help you explore information, interact with AI, generate content, and improve productivity.",

  applicationName: "TATTVA AI",

  manifest: "/manifest.json",

  icons: {
    icon: [
      { url: "/favicon.png", sizes: "64x64", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },

  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TATTVA AI",
  },

  openGraph: {
    title: "TATTVA AI – Your Intelligent AI Assistant",
    description:
      "Explore information, interact with AI, and improve productivity with TATTVA AI.",
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
    description: "Discover TATTVA AI, your intelligent AI platform.",
    images: ["/logo.png"],
  },

  robots: {
    index: true,
    follow: true,
  },

  verification: {
    google: "b_R0NO2oE0V0iBui13IyWdgZ9AROxg3MLEu_2NETiOE",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="google-site-verification" content="b_R0NO2oE0V0iBui13IyWdgZ9AROxg3MLEu_2NETiOE" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="format-detection" content="telephone=no" />
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body suppressHydrationWarning>
        <PWAProvider>{children}</PWAProvider>
      </body>
    </html>
  );
}
