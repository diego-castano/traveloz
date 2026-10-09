"use client";

// Grilla del journal: tarjetas con portada, tipo y minutos, estado y si hay
// cambios sin publicar. Filtra por estado y crea artículos nuevos.

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { BookOpen, LoaderCircle, Plus } from "lucide-react";
import { crearArticulo, type ArticuloItem } from "@/actions/collection/journal.actions";
import type { Resultado } from "@/lib/collection/ejecutar";
import { cn } from "@/components/lib/cn";
import { useCollection } from "../shell/contexto";
import { useAviso } from "../shell/Avisos";
import { Boton, EncabezadoPagina, Eyebrow, Filtros, barraHerramientas } from "../ui";
import { ESTADOS } from "../constructor/formato";
import { MedioImagen } from "../sitio/medios";
import { etiquetaArticulo } from "../sitio/tarjetas";
import type { EstadoArticulo } from "./api";

const EASE = [0.22, 1, 0.36, 1] as const;

const PILL: Record<EstadoArticulo, { label: string; estilo: keyof typeof ESTADOS }> = {
  BORRADOR: { label: "Borrador", estilo: "BORRADOR" },
  PUBLICADO: { label: "Publicado", estilo: "PUBLICADA" },
  ARCHIVADO: { label: "Archivado", estilo: "ARCHIVADA" },
};

export function EstadoArticuloPill({ estado, className }: { estado: EstadoArticulo; className?: string }) {
  const e = ESTADOS[PILL[estado].estilo];
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-sm border px-2 text-[10.5px] uppercase tracking-[0.14em]",
        e.clase,
        className,
      )}
    >
      <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", e.punto)} />
      {PILL[estado].label}
    </span>
  );
}

type Filtro = "todos" | "BORRADOR" | "PUBLICADO" | "cambios";
const FILTROS: { id: Filtro; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "BORRADOR", label: "Borradores" },
  { id: "PUBLICADO", label: "Publicados" },
  { id: "cambios", label: "Con cambios" },
];

export function ListaArticulos({
  inicial,
  crear = crearArticulo,
}: {
  inicial: ArticuloItem[] | { error: string };
  /** La ruta de desarrollo pasa una de prueba. */
  crear?: () => Promise<Resultado<{ id: string }>>;
}) {
  const router = useRouter();
  const avisar = useAviso();
  const { puede } = useCollection();
  const editable = puede("sitio.editar");
  const items = useMemo(() => (Array.isArray(inicial) ? inicial : []), [inicial]);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [creando, setCreando] = useState(false);

  const pasa = (x: ArticuloItem, f: Filtro) =>
    f === "todos" || (f === "cambios" ? x.hayCambiosSinPublicar : x.estado === f);
  const visibles = items.filter((x) => pasa(x, filtro));

  const nuevo = async () => {
    setCreando(true);
    const r = await crear().catch(() => null);
    if (!r?.ok) {
      setCreando(false);
      avisar(r?.error ?? "Sin conexión. Probá de nuevo.", "error");
      return;
    }
    router.push(`/backend/collection/journal/${r.data.id}`);
  };

  return (
    <div className="mx-auto max-w-[1600px]">
      <EncabezadoPagina
        eyebrow="Journal"
        titulo="Relatos y guías"
        descripcion={`${items.length} ${items.length === 1 ? "artículo" : "artículos"} · ${items.filter((x) => pasa(x, "PUBLICADO")).length} publicados`}
        acciones={
          editable && (
            <Boton onClick={() => void nuevo()} disabled={creando}>
              {creando ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" strokeWidth={1.5} />}
              Nuevo artículo
            </Boton>
          )
        }
      />
      <div className={barraHerramientas}>
        <Filtros
          etiqueta="Estado"
          opciones={FILTROS.map((f) => ({ ...f, n: items.filter((x) => pasa(x, f.id)).length }))}
          valor={filtro}
          onChange={setFiltro}
        />
      </div>

      {!Array.isArray(inicial) && (
        <p role="alert" className="mb-6 text-[14px] text-col-alerta">
          {inicial.error}
        </p>
      )}

      {visibles.length ? (
        <ul className="grid grid-cols-1 gap-x-8 gap-y-14 sm:grid-cols-2 xl:grid-cols-3">
          {visibles.map((a, i) => (
            <motion.li
              key={a.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE, delay: Math.min(i, 8) * 0.04 }}
            >
              <Link href={`/backend/collection/journal/${a.id}`} className="group flex flex-col gap-5" aria-label={`Abrir ${a.titulo || "artículo sin título"}`}>
                <div className="relative aspect-[4/3] overflow-hidden rounded-sm bg-col-line transition-shadow duration-300 ease-col group-hover:shadow-[0_24px_48px_-28px_rgba(50,55,59,0.5)]">
                  {a.portada ? (
                    <MedioImagen medio={a.portada} relleno sizes="(min-width: 1280px) 33vw, 50vw" imgClassName="group-hover:scale-[1.03]" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#D9D9D9] to-[#C9CDCE]">
                      <BookOpen className="h-10 w-10 text-col-base/80" strokeWidth={1} aria-hidden />
                    </div>
                  )}
                  <EstadoArticuloPill estado={a.estado} className="absolute left-3 top-3 shadow-sm" />
                </div>
                <Eyebrow>{etiquetaArticulo(a)}</Eyebrow>
                <p className={cn("-mt-1 font-col-display text-[28px] leading-[1.12]", a.titulo ? "text-col-ink" : "italic text-col-slate/50")}>
                  {a.titulo || "Sin título"}
                </p>
                {a.hayCambiosSinPublicar && (
                  <p className="-mt-2 flex items-center gap-1.5 text-[13px] text-[#B07A2A]">
                    <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-col-gold" /> Cambios sin publicar
                  </p>
                )}
              </Link>
            </motion.li>
          ))}
        </ul>
      ) : items.length ? (
        <p className="py-24 text-center font-col-display text-[26px] italic text-col-slate">Nada con ese filtro.</p>
      ) : (
        <div className="flex flex-col items-start gap-5 py-16">
          <p className="max-w-[18ch] font-col-display text-[48px] font-light leading-[1.05] text-col-ink">
            Guías, relatos y consejos para leer antes de salir.
          </p>
          <p className="max-w-[46ch] text-[16px] leading-relaxed text-col-slate">
            Cada artículo tiene su portada, su autor y las experiencias que lo acompañan.
          </p>
          {editable && (
            <Boton className="mt-3" onClick={() => void nuevo()} disabled={creando}>
              {creando ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" strokeWidth={1.5} />}
              Escribir el primero
            </Boton>
          )}
        </div>
      )}
    </div>
  );
}
