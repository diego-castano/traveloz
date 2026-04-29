"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin error:", error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card variant="default" className="max-w-md w-full">
        <CardContent className="pt-8 pb-6 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-red-500" />
            </div>
          </div>
          <h2 className="text-lg font-semibold text-neutral-800 mb-2">
            Algo salio mal
          </h2>
          <p className="text-sm text-neutral-500 mb-6">
            {error.message || "Ocurrio un error inesperado. Por favor, intenta de nuevo."}
          </p>
          <Button
            onClick={reset}
            leftIcon={<RotateCcw className="h-4 w-4" />}
          >
            Reintentar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
