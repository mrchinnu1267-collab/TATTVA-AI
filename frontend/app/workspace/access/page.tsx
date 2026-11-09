"use client";

import React, { Suspense } from "react";
import { WorkspaceMainContent } from "../page";

export default function AccessWorkspacePage() {
  return (
    <Suspense fallback={<div className="h-full w-full bg-[#0B0F19] text-white flex items-center justify-center">Loading Access...</div>}>
      <WorkspaceMainContent initialApp="access" />
    </Suspense>
  );
}
