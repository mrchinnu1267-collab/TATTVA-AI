import type { MetadataRoute } from "next";

const BASE_URL = "https://tattva-ai-phi.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/chat",
          "/image-studio",
          "/maps",
          "/download",
          "/sitemap.xml",
          "/sitemap",
          "/favicon.ico",
          "/favicon*.png",
          "/icon*.png",
          "/apple-touch-icon*.png",
          "/manifest.json",
          "/_next/static/",
          "/_next/image/",
        ],
        disallow: [
          "/api/",
          "/dashboard",
          "/login",
          "/signup",
          "/register",
          "/create-account",
          "/reset-password",
          "/auth/",
        ],
      },
      {
        userAgent: "Googlebot-Image",
        allow: [
          "/",
          "/favicon.ico",
          "/favicon*.png",
          "/icon*.png",
          "/apple-touch-icon*.png",
          "/logo*.png",
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
