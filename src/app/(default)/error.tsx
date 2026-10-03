"use client";

/**
 * Route-segment Error Boundary
 * Catches unhandled errors anywhere under the root layout and displays a
 * user-friendly fallback in their place.
 *
 * This file is app/error.tsx, NOT app/global-error.tsx — per
 * node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md,
 * only global-error.tsx (which replaces the root layout entirely when the
 * root layout itself throws) is required to render its own <html>/<body>.
 * A plain error.tsx is rendered *inside* the root layout, which already
 * provides those tags — wrapping them here a second time produced a nested
 * <html><body> tree on every caught error, the same class of bug fixed
 * earlier in src/app/[locale]/layout.tsx (duplicate Header/Footer/schema
 * instances). There's no global-error.tsx in this app, so an error thrown
 * by the root layout itself still falls through to Next's built-in error
 * page — this boundary only covers everything rendered below it.
 */

import { useEffect } from "react";
import Link from "next/link";

interface ErrorProps {
  error: Error & { digest?: string };
  // `retry` is the stable prop as of Next 16.3.0 (re-fetches and re-renders
  // the boundary's children); `reset` still works but retry is preferred —
  // see the file-conventions doc referenced above.
  retry: () => void;
}

export default function Error({ error, retry }: ErrorProps) {
  useEffect(() => {
    // Log error for monitoring
    console.error("Application error:", error);
  }, [error]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md px-4">
        <div className="text-6xl mb-4">⚠️</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Something went wrong
        </h1>
        <p className="text-gray-600 mb-6">
          We encountered an unexpected error. Please try again or return to the homepage.
        </p>

        {process.env.NODE_ENV === "development" && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
            <p className="text-xs font-mono text-red-800 break-words">
              {error.message}
            </p>
            {error.digest && (
              <p className="text-xs text-red-600 mt-2">
                Error ID: {error.digest}
              </p>
            )}
          </div>
        )}

        <div className="flex gap-3 justify-center">
          <button
            onClick={retry}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Try again
          </button>
          <Link
            href="/"
            className="px-6 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition"
          >
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
