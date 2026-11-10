"use client";

import React, { Suspense } from "react";
import { WorkspaceMainContent } from "../page";

export default function AccessWorkspacePage() {
  return (
    <Suspense fallback={<div className="h-full w-full bg-white text-black flex items-center justify-center font-medium text-xs">Loading Access Studio...</div>}>
      <WorkspaceMainContent initialApp="access" />
    </Suspense>
  );
}

