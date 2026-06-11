"use client";

import { useEffect } from "react";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Root error:", error);
  }, [error]);

  return (
    <div className="font-body antialiased bg-neutral-50 flex items-center justify-center min-h-screen">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="text-4xl mb-4">⚠</div>
        <h2 className="text-lg font-semibold text-neutral-800 mb-2">
          Error del sistema
        </h2>
        <p className="text-sm text-neutral-500 mb-6">
          Ocurrió un error inesperado. Por favor, intentá de nuevo.
          {error.digest ? (
            <span className="block mt-2 text-xs text-neutral-400">
              Ref: {error.digest}
            </span>
          ) : null}
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 transition-colors"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}
