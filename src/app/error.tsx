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
    <html lang="es">
      <body className="font-body antialiased bg-neutral-50">
        <div className="flex items-center justify-center min-h-screen">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="text-4xl mb-4">⚠</div>
            <h2 className="text-lg font-semibold text-neutral-800 mb-2">
              Error del sistema
            </h2>
            <p className="text-sm text-neutral-500 mb-6">
              {error.message || "Ocurrio un error inesperado."}
            </p>
            <button
              onClick={reset}
              className="px-4 py-2 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 transition-colors"
            >
              Reintentar
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
