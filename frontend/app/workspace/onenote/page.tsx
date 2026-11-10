"use client";

import React, { Suspense } from "react";
import { WorkspaceMainContent } from "../page";

export default function OneNoteWorkspacePage() {
  return (
    <Suspense fallback={<div className="h-full w-full bg-[#0B0F19] text-white flex items-center justify-center">Loading OneNote...</div>}>
      <WorkspaceMainContent initialApp="onenote" />
    </Suspense>
  );
}

