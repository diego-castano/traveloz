"use client";

// Las páginas fijas del sitio como tarjetas grandes: una miniatura en vivo
// del primer bloque, la ruta y si hay cambios sin publicar.

import { useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import type { PaginaVista } from "@/lib/collection/paginas/contenido";
import type { PaginaItem } from "@/actions/collection/paginas.actions";
import { cn } from "@/components/lib/cn";
import { EncabezadoPagina, Estado } from "../ui";
import { PaginaRender } from "../sitio/pagina/PaginaRender";
import { PaginaLegal } from "../sitio/pagina/PaginaLegal";
import { fechaLarga } from "../sitio/tarjetas";
import { useEntradaLista } from "../movimiento";

const ANCHO = 1280;

export interface TarjetaPagina {
  item: PaginaItem;
  /** Solo el primer bloque visible, ya resuelto. */
  vista: PaginaVista;
  legal: boolean;
}

/** La página dibujada a 1280 px y escalada al ancho de la tarjeta. */
function Miniatura({ vista, legal }: { vista: PaginaVista; legal: boolean }) {
  const caja = useRef<HTMLDivElement>(null);
  const [escala, setEscala] = useState(0);
  useLayoutEffect(() => {
    const el = caja.current;
    if (!el) return;
    // Sin foco ni clics adentro: es solo una imagen de la página.
    el.setAttribute("inert", "");
    const ro = new ResizeObserver(() => setEscala(el.clientWidth / ANCHO));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={caja} aria-hidden className="pointer-events-none relative aspect-[16/9] select-none overflow-hidden bg-col-surface">
      <div
        className={cn("origin-top-left transition-opacity duration-col-lento", !escala && "opacity-0")}
        style={{ width: ANCHO, transform: `scale(${escala || 1})` }}
      >
        {legal ? <PaginaLegal vista={vista} modo="sitio" /> : <PaginaRender vista={vista} modo="sitio" />}
      </div>
    </div>
  );
}

export function ListaPaginas({ inicial }: { inicial: TarjetaPagina[] | { error: string } }) {
  if (!Array.isArray(inicial)) {
    return (
      <p role="alert" className="text-col-md text-col-alerta">
        {inicial.error}
      </p>
    );
  }
  return <Lista inicial={inicial} />;
}

function Lista({ inicial }: { inicial: TarjetaPagina[] }) {
  const entrada = useEntradaLista();
  const principales = inicial.filter((x) => !x.legal);
  const legales = inicial.filter((x) => x.legal);
  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-16">
      <EncabezadoPagina
        className="mb-0"
        titulo="El sitio, por bloques"
        descripcion="Lo que edites se guarda solo y llega al sitio cuando tocás Publicar cambios."
      />
      <section className="grid grid-cols-1 gap-x-8 gap-y-12 lg:grid-cols-2">
        {principales.map((x, i) => (
          <Tarjeta key={x.item.slug} x={x} i={i} entrada={entrada} grande />
        ))}
      </section>
      {legales.length > 0 && (
        <section>
          <p className="mb-6 flex items-center gap-3 text-col-xs uppercase tracking-[0.14em] text-col-slate">
            <span aria-hidden className="h-px w-6 bg-col-gold" /> Legales
          </p>
          <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
            {legales.map((x, i) => (
              <Tarjeta key={x.item.slug} x={x} i={i + principales.length} entrada={entrada} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Tarjeta({
  x,
  i,
  entrada,
  grande,
}: {
  x: TarjetaPagina;
  i: number;
  entrada: ReturnType<typeof useEntradaLista>;
  grande?: boolean;
}) {
  const { item } = x;
  const publicada = fechaLarga(item.publicadaEn);
  return (
    <motion.div {...entrada(i)} layout={false} className="group relative">
      <div className="relative overflow-hidden rounded-col-sm border border-col-line transition-[box-shadow,transform] duration-col-lento ease-col group-hover:-translate-y-0.5 group-hover:shadow-col-2">
        <Miniatura vista={x.vista} legal={x.legal} />
        <span className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-col-sm bg-col-ink/80 text-col-base opacity-0 backdrop-blur-sm transition-opacity duration-col ease-col group-hover:opacity-100">
          <ArrowUpRight className="h-4 w-4" strokeWidth={1.5} aria-hidden />
        </span>
      </div>
      <div className="mt-4 flex items-start justify-between gap-6">
        <div className="min-w-0">
          <p className={cn("font-col-display leading-[1.1] text-col-ink", grande ? "text-col-3xl" : "text-col-xl")}>{item.titulo}</p>
          <p className="mt-1 font-mono text-col-xs text-col-slate">{item.ruta}</p>
        </div>
        <div className="shrink-0 text-right text-col-sm">
          {item.hayCambiosSinPublicar ? (
            <Estado tono="aviso">Cambios sin publicar</Estado>
          ) : (
            <p className="text-col-slate">{publicada ? `Publicada el ${publicada}` : "Sin publicar"}</p>
          )}
          <p className="mt-1 tabular-nums lining-nums text-col-muted">
            {item.bloques} {item.bloques === 1 ? "bloque" : "bloques"}
          </p>
        </div>
      </div>
      {/* El enlace va encima y no envuelve la miniatura: la página dibujada tiene sus propios <a>. */}
      <Link
        href={`/backend/collection/paginas/${item.slug}`}
        aria-label={`Editar ${item.titulo}`}
        className="absolute inset-0 rounded-col-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-col-gold"
      />
    </motion.div>
  );
}
