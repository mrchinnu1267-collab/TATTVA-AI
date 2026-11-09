"use client";

import React, { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PresentationStudio } from "../components/presentation-studio/PresentationStudio";
import { Loader2 } from "lucide-react";

function PresentationStudioPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const title = searchParams.get("title") || "TATTVA AI Presentation";
  const themeId = searchParams.get("theme") || "dark_modern";
  const downloadUrl = searchParams.get("url") || undefined;
  const fileId = searchParams.get("fileId") || undefined;

  return (
    <PresentationStudio
      initialTitle={title}
      initialThemeId={themeId}
      downloadUrl={downloadUrl}
      vaultFileId={fileId}
      onClose={() => router.back()}
    />
  );
}

export default function PresentationStudioPage() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 bg-[#1F1F1F] flex items-center justify-center text-white">
          <div className="flex items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-[#C43E1C]" />
            <span className="font-semibold text-sm">Loading TATTVA Presentation Studio...</span>
          </div>
        </div>
      }
    >
      <PresentationStudioPageContent />
    </Suspense>
  );
}
