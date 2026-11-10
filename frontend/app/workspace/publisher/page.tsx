"use client";

import React, { Suspense } from "react";
import { WorkspaceMainContent } from "../page";

export default function PublisherWorkspacePage() {
  return (
    <Suspense fallback={<div className="h-full w-full bg-white text-black flex items-center justify-center font-medium text-xs">Loading Publisher Studio...</div>}>
      <WorkspaceMainContent initialApp="publisher" />
    </Suspense>
  );
}

