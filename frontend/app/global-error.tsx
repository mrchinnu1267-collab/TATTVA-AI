"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center bg-[#0d0e11] text-white p-6 font-sans">
        <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-6 text-center shadow-xl">
          <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-6 h-6 stroke-current"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-bold mb-2">Something went wrong</h2>
          <p className="text-xs text-neutral-400 mb-6 leading-relaxed">
            An unexpected application error has been detected and logged to our monitoring center.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="w-full py-2.5 px-4 rounded-xl bg-white text-black font-semibold text-xs hover:bg-neutral-200 transition cursor-pointer"
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}

