// Piezas de servidor de las páginas del sitio: raíz con los estilos, cabecera
// de página, estado vacío, "Muy pronto" y JSON-LD.

import Link from "next/link";
import { MarcaCollection } from "@/components/collection/shell/MarcaCollection";
import { cn } from "@/components/lib/cn";
import { CONTACTO_SITIO } from "./menu";
import "../sitio.css";

/** Raíz de una página del sitio: activa las container queries de sitio.css. */
export function RaizSitio({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("cs-raiz", className)} data-modo="sitio">
      {children}
    </div>
  );
}

export function CabeceraPagina({
  titulo,
  bajada,
  children,
}: {
  titulo: string;
  bajada?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="border-b border-col-line bg-col-surface">
      <div className="cs-envolvente flex flex-col gap-6 pb-12 pt-16">
        <h1 className="cs-h1 max-w-[20ch]">{titulo}</h1>
        {bajada && <p className="max-w-[56ch] text-[18px] font-light leading-[1.6] text-col-slate">{bajada}</p>}
        {children}
      </div>
    </header>
  );
}

/** Lista sin nada publicado todavía: una línea elegante y la salida a Contactanos. */
export function EstadoVacio({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="cs-envolvente flex flex-col items-start gap-6 py-24">
      <span aria-hidden className="h-px w-12 bg-col-gold" />
      <h2 className="cs-h2 max-w-[22ch]">{titulo}</h2>
      <p className="max-w-[52ch] text-[17px] font-light leading-[1.65] text-col-slate">{texto}</p>
      <Link
        href={CONTACTO_SITIO.href}
        className="mt-2 inline-flex h-12 items-center rounded-sm bg-col-ink px-6 text-[13px] font-medium uppercase tracking-[0.12em] text-col-base transition-colors duration-200 ease-col hover:bg-col-slate active:translate-y-px"
      >
        {CONTACTO_SITIO.nombre}
      </Link>
    </div>
  );
}

/** Página que todavía no se publicó: la marca sobre el azul noche y una línea. */
export function EnPreparacion({ titulo = "Muy pronto", texto }: { titulo?: string; texto: string }) {
  return (
    <div data-portada="">
      <section className="flex min-h-[100dvh] flex-col items-center justify-center gap-10 bg-col-noche px-6 py-32 text-center text-white">
        <MarcaCollection tono="oscuro" className="scale-[1.6]" />
        <span aria-hidden className="mt-6 h-px w-12 bg-col-gold" />
        <h1 className="font-col-display text-[44px] font-light leading-[1.1] md:text-[64px]">{titulo}</h1>
        <p className="max-w-[44ch] text-[17px] font-light leading-[1.65] text-white/75">{texto}</p>
        <Link
          href={CONTACTO_SITIO.href}
          className="inline-flex h-12 items-center rounded-sm border border-white/40 px-6 text-[13px] font-medium uppercase tracking-[0.12em] transition-colors duration-200 ease-col hover:border-col-gold hover:text-col-gold"
        >
          {CONTACTO_SITIO.nombre}
        </Link>
      </section>
    </div>
  );
}

export function JsonLd({ datos }: { datos: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(datos).replace(/</g, "\\u003c") }}
    />
  );
}
