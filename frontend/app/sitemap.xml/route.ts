const BASE_URL = "https://tattva-ai-phi.vercel.app";

// Canonical, genuinely public, indexable landing pages only
// Excludes:
// - /dashboard, /login, /signup, /register, /reset-password (private & authentication routes)
// - /api/* (backend endpoints)
const PUBLIC_ROUTES = [
  { path: "", changefreq: "weekly", priority: "1.0" },
  { path: "/chat", changefreq: "daily", priority: "0.9" },
  { path: "/images", changefreq: "daily", priority: "0.9" },
  { path: "/image-studio", changefreq: "weekly", priority: "0.8" },
  { path: "/maps", changefreq: "weekly", priority: "0.8" },
  { path: "/media", changefreq: "weekly", priority: "0.8" },
  { path: "/voice", changefreq: "weekly", priority: "0.8" },
  { path: "/download", changefreq: "monthly", priority: "0.8" },
];

export const dynamic = "force-static";
export const revalidate = 86400; // 24 hours

export async function GET() {
  const lastmod = new Date().toISOString();

  const urlEntries = PUBLIC_ROUTES.map(
    (route) => `  <url>
    <loc>${BASE_URL}${route.path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`
  ).join("\n");

  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;

  return new Response(xmlContent.trim(), {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=86400",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'self'; style-src 'self' 'unsafe-inline';",
    },
  });
}
