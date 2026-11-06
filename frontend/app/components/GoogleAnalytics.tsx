"use client";

import { useEffect, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";
import { GA_MEASUREMENT_ID, pageview } from "../lib/gtag";

function AnalyticsNavigationTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname) return;
    const queryString = searchParams?.toString();
    const url = queryString ? `${pathname}?${queryString}` : pathname;
    pageview(url);
  }, [pathname, searchParams]);

  return null;
}

export default function GoogleAnalytics({ nonce }: { nonce?: string }) {
  if (!GA_MEASUREMENT_ID) {
    return null;
  }

  const isDebug =
    process.env.NEXT_PUBLIC_GA_DEBUG === "true" ||
    process.env.NODE_ENV === "development";

  return (
    <>
      {/* 1. Official Google tag (gtag.js) */}
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        nonce={nonce}
      />

      {/* 2. Initialization script */}
      <Script
        id="google-analytics-init"
        strategy="afterInteractive"
        nonce={nonce}
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}', {
              page_path: window.location.pathname,
              send_page_view: false,
              debug_mode: ${isDebug ? "true" : "false"}
            });
          `,
        }}
      />

      {/* 3. Client-side SPA navigation tracker wrapped in Suspense */}
      <Suspense fallback={null}>
        <AnalyticsNavigationTracker />
      </Suspense>
    </>
  );
}

