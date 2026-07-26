"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen flex items-center justify-center px-6 text-center bg-indigo-900">
      <div className="max-w-sm">
        <div className="text-3xl mb-3">⚠️</div>
        <h1 className="font-display italic text-2xl text-sand">Something went wrong</h1>
        <p className="text-sand/60 text-sm mt-2">
          An unexpected error occurred. Try again, or head back to the dashboard.
        </p>
        <div className="flex gap-2 mt-6 justify-center">
          <button
            onClick={() => reset()}
            className="focus-ring rounded-full bg-gold-500 text-indigo-950 font-medium px-5 py-2.5 text-sm hover:bg-gold-400"
          >
            Try again
          </button>
          <a
            href="/"
            className="focus-ring rounded-full border border-sand/20 text-sand px-5 py-2.5 text-sm hover:border-gold-500/40"
          >
            Go home
          </a>
        </div>
      </div>
    </main>
  );
}
