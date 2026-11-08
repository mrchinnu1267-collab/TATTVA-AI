import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import DownloadTrackButton from "../components/DownloadTrackButton";

export const metadata: Metadata = {
  metadataBase: new URL("https://tattva-ai-phi.vercel.app"),
  title: "Download TATTVA AI for Android | TATTVA AI",
  description:
    "Download the official TATTVA AI Android app APK. Access intelligent AI chat, satellite maps, local weather, and fast AI reasoning on mobile.",
  alternates: {
    canonical: "https://tattva-ai-phi.vercel.app/download",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Download TATTVA AI for Android | TATTVA AI",
    description:
      "Download the official TATTVA AI Android app APK. Access intelligent AI chat, satellite maps, local weather, and fast AI reasoning on mobile.",
    url: "https://tattva-ai-phi.vercel.app/download",
    siteName: "TATTVA AI",
    type: "website",
    images: [{ url: "/logo.png", width: 512, height: 512, alt: "TATTVA AI Logo" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Download TATTVA AI for Android | TATTVA AI",
    description:
      "Download the official TATTVA AI Android app APK. Access intelligent AI chat, satellite maps, local weather, and fast AI reasoning on mobile.",
    images: ["/logo.png"],
  },
};

const downloadStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "TATTVA AI for Android",
      operatingSystem: "Android",
      applicationCategory: "BusinessApplication",
      url: "https://tattva-ai-phi.vercel.app/download",
      downloadUrl: "https://tattva-ai-phi.vercel.app/api/download",
      softwareVersion: "1.2",
      fileSize: "12.2MB",
      description:
        "Official Android App for TATTVA AI - Intelligent Reasoning, Hyper-local Weather, and Autonomous Multi-Modal Chat.",
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
          name: "Download",
          item: "https://tattva-ai-phi.vercel.app/download",
        },
      ],
    },
  ],
};

export default function DownloadPage() {
  return (
    <div className="min-h-screen bg-[#070A11] text-white flex flex-col justify-between selection:bg-cyan-500/30">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(downloadStructuredData).replace(/</g, "\\u003c"),
        }}
      />
      {/* Background ambient glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gradient-to-b from-cyan-500/15 via-indigo-500/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-40 right-10 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 max-w-5xl mx-auto w-full px-6 py-6 flex items-center justify-between border-b border-white/5">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-white p-1 shadow-lg shadow-cyan-500/10 border border-white/10 flex items-center justify-center transition group-hover:scale-105">
            <Image
              src="/logo.png"
              alt="TATTVA AI Logo"
              width={36}
              height={36}
              className="object-contain"
              priority
            />
          </div>
          <div>
            <span className="font-bold tracking-tight text-lg bg-gradient-to-r from-white via-slate-200 to-cyan-400 bg-clip-text text-transparent">
              TATTVA AI
            </span>
            <span className="text-[10px] block text-cyan-400 font-mono tracking-wider -mt-1">
              MOBILE EDITION
            </span>
          </div>
        </Link>

        <Link
          href="/chat"
          className="text-xs font-medium text-slate-300 hover:text-white px-3.5 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition"
        >
          Open Web Chat &rarr;
        </Link>
      </header>

      {/* Main Content Hero */}
      <main className="relative z-10 max-w-3xl mx-auto px-6 py-12 text-center flex-1 flex flex-col items-center justify-center">
        {/* App Icon badge */}
        <div className="relative mb-6">
          <div className="w-28 h-28 rounded-3xl bg-white p-2 shadow-2xl shadow-cyan-500/20 border-2 border-cyan-400/30 flex items-center justify-center">
            <Image
              src="/logo.png"
              alt="TATTVA AI Icon"
              width={96}
              height={96}
              className="object-contain"
              priority
            />
          </div>
          <span className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-full bg-cyan-500 text-[10px] font-bold text-black uppercase tracking-wider shadow">
            v1.2
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-3">
          TATTVA AI for Android
        </h1>
        <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto mb-8 leading-relaxed">
          The next-generation autonomous AI companion with intelligent multimodal reasoning, real-time hyper-local weather, and system response notifications.
        </p>

        {/* Action Buttons */}
        <div className="w-full max-w-md flex flex-col sm:flex-row gap-3 mb-10">
          <DownloadTrackButton
            href="/api/download"
            format="apk"
            className="flex-1 py-3.5 px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-semibold text-sm shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2.5 transition active:scale-[0.98]"
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M12 16l4-4h-3V4h-2v8H8l4 4zm-8 2h16v2H4v-2z" />
            </svg>
            <span>Download APK (12.2 MB)</span>
          </DownloadTrackButton>

          <DownloadTrackButton
            href="/api/download?format=zip"
            format="zip"
            className="py-3.5 px-5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700 font-medium text-sm flex items-center justify-center gap-2 transition"
          >
            <svg className="w-4 h-4 fill-current opacity-70" viewBox="0 0 24 24">
              <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z" />
            </svg>
            <span>Download ZIP</span>
          </DownloadTrackButton>
        </div>

        {/* Feature Highlights Grid */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-3 text-left mb-12">
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
            <div className="text-cyan-400 font-semibold text-xs mb-1 flex items-center gap-1.5">
              <span>⚡</span> Autonomous AI Chat
            </div>
            <p className="text-[12px] text-slate-400 leading-normal">
              Ultra-fast conversational reasoning powered by Google Gemini and deep research models.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
            <div className="text-cyan-400 font-semibold text-xs mb-1 flex items-center gap-1.5">
              <span>📍</span> Live Local Weather
            </div>
            <p className="text-[12px] text-slate-400 leading-normal">
              Automatic GPS weather reports with temperature, humidity, and 3-day forecast.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
            <div className="text-cyan-400 font-semibold text-xs mb-1 flex items-center gap-1.5">
              <span>🔔</span> System Notifications
            </div>
            <p className="text-[12px] text-slate-400 leading-normal">
              Instant notification shades for every AI answer and completion.
            </p>
          </div>
        </div>

        {/* Installation Steps */}
        <div className="w-full max-w-lg p-5 rounded-2xl bg-white/[0.02] border border-white/5 text-left">
          <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
            Quick Installation Guide
          </h2>
          <ol className="text-xs text-slate-400 space-y-2 list-decimal list-inside leading-relaxed">
            <li>Tap the <strong className="text-white">Download APK</strong> button above on your Android device.</li>
            <li>Once the download completes, tap the file in your notification bar or Downloads folder.</li>
            <li>If prompted with <em>&quot;Install unknown apps&quot;</em>, allow permission for your browser.</li>
            <li>Tap <strong className="text-white">Install</strong> and launch TATTVA AI!</li>
          </ol>
        </div>
      </main>

      {/* Footer with Cross-Page Internal Links */}
      <footer className="relative z-10 max-w-5xl mx-auto w-full px-6 py-6 border-t border-white/5 text-center text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-3">
        <span>Conceptualized &amp; Engineered by kotapati Gowtham Chowdary &bull; TATTVA AI Mobile v1.2</span>
        <div className="flex items-center gap-4 text-xs font-medium">
          <Link href="/" className="hover:text-cyan-400 transition">Web Chat</Link>
          <Link href="/maps" className="hover:text-cyan-400 transition">Satellite Maps</Link>
          <Link href="/image-studio" className="hover:text-cyan-400 transition">Image Studio</Link>
        </div>
      </footer>
    </div>
  );
}
