"use client";

import React, { Suspense } from "react";
import { WorkspaceMainContent } from "../page";

export default function PublisherWorkspacePage() {
  return (
    <Suspense fallback={<div className="h-full w-full bg-[#0B0F19] text-white flex items-center justify-center">Loading Publisher...</div>}>
      <WorkspaceMainContent initialApp="publisher" />
    </Suspense>
  );
}

