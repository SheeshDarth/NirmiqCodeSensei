"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";

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
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-red-500/10 mb-4">
        <AlertCircle size={22} className="text-red-400" />
      </div>
      <h2 className="text-base font-semibold text-zinc-100 mb-1">
        Something went wrong
      </h2>
      <p className="text-sm text-zinc-500 mb-5 max-w-sm">
        {error.message ?? "An unexpected error occurred. Please try again."}
      </p>
      <button
        onClick={reset}
        className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium px-4 py-2 rounded-md transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
