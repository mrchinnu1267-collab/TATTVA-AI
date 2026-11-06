"use client";

import React from "react";
import { trackFileDownloaded } from "../lib/gtag";

interface DownloadTrackButtonProps {
  href: string;
  className: string;
  format: "apk" | "zip";
  children: React.ReactNode;
}

export default function DownloadTrackButton({
  href,
  className,
  format,
  children,
}: DownloadTrackButtonProps) {
  const handleClick = () => {
    try {
      trackFileDownloaded(format);
    } catch {
      // ignore
    }
  };

  return (
    <a href={href} onClick={handleClick} className={className}>
      {children}
    </a>
  );
}

