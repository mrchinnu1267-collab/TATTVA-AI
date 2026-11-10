"use client";

import React, { Suspense } from "react";
import { WorkspaceMainContent } from "../page";

export default function WordWorkspacePage() {
  return (
    <Suspense fallback={<div className="h-full w-full bg-[#0B0F19] text-white flex items-center justify-center">Loading Word...</div>}>
      <WorkspaceMainContent initialApp="word" />
    </Suspense>
  );
}

