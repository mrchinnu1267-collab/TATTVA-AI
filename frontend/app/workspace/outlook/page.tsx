"use client";

import React, { Suspense } from "react";
import { WorkspaceMainContent } from "../page";

export default function OutlookWorkspacePage() {
  return (
    <Suspense fallback={<div className="h-full w-full bg-white text-black flex items-center justify-center font-medium text-xs">Loading Outlook Studio...</div>}>
      <WorkspaceMainContent initialApp="outlook" />
    </Suspense>
  );
}

