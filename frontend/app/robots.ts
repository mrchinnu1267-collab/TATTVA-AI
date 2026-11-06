import type { MetadataRoute } from "next";

const BASE_URL = "https://tattva-ai-phi.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: [
        "/",
        "/chat",
        "/images",
        "/image-studio",
        "/maps",
        "/media",
        "/voice",
        "/download",
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
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
