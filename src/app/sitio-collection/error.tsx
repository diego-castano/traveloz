"use client";

import { useEffect } from "react";
import Link from "next/link";
import "@/components/collection/sitio/sitio.css";

export default function ErrorSitio({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="cs-raiz" data-modo="sitio">
      <section className="cs-envolvente flex min-h-[70dvh] flex-col items-start justify-center gap-7 py-24">
        <span aria-hidden className="h-px w-12 bg-col-gold" />
        <h1 className="cs-h1 max-w-[18ch]">Algo no salió como esperábamos.</h1>
        <p className="max-w-[48ch] text-[17px] font-light leading-[1.65] text-col-slate">
          No pudimos cargar esta página. Probá de nuevo en unos segundos.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-12 items-center rounded-sm bg-col-ink px-6 text-[13px] font-medium uppercase tracking-[0.12em] text-col-base transition-colors duration-200 ease-col hover:bg-col-slate active:translate-y-px"
          >
            Reintentar
          </button>
          <Link
            href="/"
            className="inline-flex h-12 items-center rounded-sm border border-col-ink/25 px-6 text-[13px] font-medium uppercase tracking-[0.12em] text-col-ink transition-colors duration-200 ease-col hover:border-col-ink"
          >
            Ir al inicio
          </Link>
        </div>
      </section>
    </div>
  );
}
