// Inicio de Collection: lo que pide atención hoy (consultas nuevas, viajes en
// revisión, cambios sin publicar), seguir donde se dejó, la guía de arranque
// mientras falte algo y lo último de la biblioteca. Sin hooks: lo arma la
// página del servidor y también la ruta de desarrollo con datos de mentira.

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import type { ExperienciaItem } from "@/actions/collection/experiencias.actions";
import type { ColMedioDto } from "@/actions/collection/medios.actions";
import { cn } from "@/components/lib/cn";
import { Eyebrow } from "../ui";
import { EstadoPill } from "../constructor/formato";
import { MedioImagen as ImagenSitio } from "../sitio/medios";
import { MedioImagen, aspectoDe } from "../biblioteca/MedioImagen";
import { Numero } from "../movimiento";

export interface DatosInicio {
  saludo: string;
  nombre: string;
  fecha: string;
  /** null: no tiene permiso para ver consultas. */
  consultasNuevas: number | null;
  experiencias: ExperienciaItem[];
  destinos: number;
  medios: { total: number; sinDescripcion: number; ultimos: ColMedioDto[] | { error: string } };
}

const B = "/backend/collection";

export function Inicio({ d }: { d: DatosInicio }) {
  const enRevision = d.experiencias.filter((x) => x.estado === "EN_REVISION").length;
  const sinPublicar = d.experiencias.filter((x) => x.hayCambiosSinPublicar).length;
  // Las tres tocadas más recientemente: el "seguí donde dejaste".
  const recientes = [...d.experiencias].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 3);

  const hoy = [
    ...(d.consultasNuevas === null
      ? []
      : [
          {
            n: d.consultasNuevas,
            label: d.consultasNuevas === 1 ? "Consulta nueva" : "Consultas nuevas",
            nota: d.consultasNuevas ? "Esperan respuesta" : "Todo respondido",
            href: `${B}/consultas`,
            punto: d.consultasNuevas > 0 ? "bg-col-info" : null,
          },
        ]),
    {
      n: enRevision,
      label: "En revisión",
      nota: enRevision ? "Viajes esperando el visto bueno" : "Nada esperando revisión",
      href: `${B}/experiencias`,
      punto: enRevision > 0 ? "bg-col-info" : null,
    },
    {
      n: sinPublicar,
      label: "Cambios sin publicar",
      nota: sinPublicar ? "Editados después de publicar" : "El sitio está al día",
      href: `${B}/experiencias`,
      punto: sinPublicar > 0 ? "bg-col-aviso" : null,
    },
  ];

  const pasos = [
    { titulo: "Subí fotos a la biblioteca", texto: "Arrastrá tus fotos y videos. Les sacamos el color, las medidas y los tamaños para la web.", href: `${B}/biblioteca`, hecho: d.medios.total > 0 },
    { titulo: "Creá los destinos", texto: "El mosaico de lugares que ordena el sitio.", href: `${B}/destinos`, hecho: d.destinos > 0 },
    { titulo: "Armá tu primera experiencia", texto: "Portada, relato, recorrido y día a día, con vista previa.", href: `${B}/experiencias`, hecho: d.experiencias.length > 0 },
  ];
  const guiaCompleta = pasos.every((p) => p.hecho);
  const ultimos = "error" in d.medios.ultimos ? null : d.medios.ultimos;

  return (
    <div className="mx-auto max-w-[1360px]">
      <section className="pb-8">
        <Eyebrow>Traveloz Collection</Eyebrow>
        <h1 className="mt-3 font-col-display text-col-display font-light text-col-ink">
          {d.saludo}
          {d.nombre && (
            <>
              , <em className="font-normal italic">{d.nombre}</em>
            </>
          )}
          .
        </h1>
        <p className="mt-1 text-col-cuerpo text-col-muted">{d.fecha.charAt(0).toUpperCase() + d.fecha.slice(1)}</p>
      </section>

      <section aria-labelledby="hoy">
        <h2 id="hoy" className="sr-only">
          Para hoy
        </h2>
        <ul className={cn("grid border-y border-col-line sm:grid-cols-2", hoy.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-2")}>
          {hoy.map((n, i) => (
            <li key={n.label} className={cn(i > 0 && "border-t border-col-line sm:border-l sm:border-t-0", i === 2 && "sm:col-span-2 sm:border-l-0 sm:border-t lg:col-span-1 lg:border-l lg:border-t-0")}>
              <Link href={n.href} className="group flex h-full flex-col px-5 py-6 transition-colors duration-col ease-col hover:bg-col-surface md:px-7">
                <Numero valor={n.n} className="text-col-3xl font-light text-col-ink" />
                <span className="mt-3 flex items-center gap-2 text-col-md font-medium text-col-ink">
                  {n.punto && <span aria-hidden className={cn("h-2 w-2 rounded-full", n.punto)} />}
                  {n.label}
                </span>
                <span className="mt-0.5 text-col-sm text-col-muted">{n.nota}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {recientes.length > 0 && (
        <section aria-labelledby="seguir" className="pt-12">
          <div className="mb-5 flex items-end justify-between gap-4">
            <h2 id="seguir" className="font-col-display text-col-3xl font-light text-col-ink">
              Seguí donde dejaste
            </h2>
            <VerTodo href={`${B}/experiencias`}>Todas las experiencias</VerTodo>
          </div>
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {recientes.map((x) => {
              const pct = Math.round(x.completitud * 100);
              return (
                <li key={x.id}>
                  <Link href={`${B}/experiencias/${x.id}`} className="group block rounded-col-sm">
                    <div className="relative aspect-[4/3] overflow-hidden rounded-col-sm bg-col-line transition-[transform,box-shadow] duration-col ease-col group-hover:-translate-y-0.5 group-hover:shadow-col-2">
                      {x.portada ? (
                        <ImagenSitio medio={x.portada} relleno sizes="(min-width: 1024px) 33vw, 100vw" imgClassName="transition-transform duration-col-lento ease-col group-hover:scale-[1.02]" />
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center text-col-sm text-col-slate">Falta la portada</span>
                      )}
                      <EstadoPill estado={x.estado} className="absolute left-3 top-3 shadow-col-1" />
                      {pct < 100 && (
                        <span aria-hidden className="absolute inset-x-0 bottom-0 h-1 bg-col-ink/20">
                          <span className="block h-full bg-col-gold" style={{ width: `${pct}%` }} />
                        </span>
                      )}
                    </div>
                    <p className={cn("mt-3 font-col-display text-col-xl", x.titulo ? "text-col-ink" : "italic text-col-muted")}>
                      {x.titulo || "Sin título"}
                    </p>
                    <p className="mt-0.5 text-col-sm text-col-muted">{pct < 100 ? `${pct} % completa` : "Completa"}</p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {!guiaCompleta && (
        <section aria-labelledby="guia" className="grid gap-8 pt-14 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <h2 id="guia" className="font-col-display text-col-3xl font-light text-col-ink">
              Empezá por acá
            </h2>
            <p className="mt-2 max-w-[34ch] text-col-cuerpo text-col-muted">Tres pasos para que el sitio tenga con qué contar sus viajes.</p>
          </div>
          <ol className="divide-y divide-col-line border-y border-col-line lg:col-span-8">
            {pasos.map((p, i) => (
              <li key={p.titulo}>
                <Link href={p.href} className="group flex gap-5 px-1 py-5 transition-colors duration-col ease-col hover:bg-col-surface/60">
                  <span className={cn("flex w-10 shrink-0 font-col-display text-col-3xl font-light italic", p.hecho ? "text-col-ok" : "text-col-muted")}>
                    {p.hecho ? <Check className="mt-1 h-6 w-6" strokeWidth={1.5} aria-label="Hecho" /> : i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block text-col-lg", p.hecho ? "text-col-muted line-through decoration-col-line" : "text-col-ink")}>{p.titulo}</span>
                    <span className="mt-0.5 block text-col-md text-col-muted">{p.texto}</span>
                  </span>
                  <ArrowRight className="h-5 w-5 shrink-0 self-center text-col-slate transition-transform duration-col ease-col group-hover:translate-x-1 group-hover:text-col-ink" strokeWidth={1.5} aria-hidden />
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section aria-labelledby="recientes" className="pb-8 pt-14">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
          <div>
            <h2 id="recientes" className="font-col-display text-col-3xl font-light text-col-ink">
              Lo último en la biblioteca
            </h2>
            {d.medios.sinDescripcion > 0 && (
              <Link href={`${B}/biblioteca?filtro=sin-alt`} className="mt-1 inline-flex items-center gap-2 text-col-sm text-col-aviso underline decoration-col-aviso/40 underline-offset-4 hover:decoration-col-aviso">
                <span aria-hidden className="h-2 w-2 rounded-full bg-col-aviso" />
                {d.medios.sinDescripcion === 1 ? "1 foto sin descripción para Google" : `${d.medios.sinDescripcion} fotos sin descripción para Google`}
              </Link>
            )}
          </div>
          <VerTodo href={`${B}/biblioteca`}>Ver la biblioteca</VerTodo>
        </div>
        {!ultimos ? (
          <p className="text-col-md text-col-error">{"error" in d.medios.ultimos && d.medios.ultimos.error}</p>
        ) : ultimos.length === 0 ? (
          <Link
            href={`${B}/biblioteca`}
            className="flex h-48 flex-col items-center justify-center rounded-col border border-dashed border-col-slate/30 text-center transition-colors duration-col ease-col hover:border-col-foco hover:bg-col-surface"
          >
            <span className="font-col-display text-col-2xl font-light italic text-col-ink">Todavía no hay fotos</span>
            <span className="mt-1 text-col-md text-col-muted">Subí las primeras desde la biblioteca.</span>
          </Link>
        ) : (
          // Filas justificadas que envuelven (nada de scroll horizontal); se ven hasta dos.
          <ul className="flex max-h-[412px] flex-wrap gap-3 overflow-hidden">
            {ultimos.map((m) => (
              <li key={m.id} className="min-w-0" style={{ flexGrow: aspectoDe(m), flexBasis: `${Math.round(200 * aspectoDe(m))}px` }}>
                <Link href={`${B}/biblioteca?medio=${m.id}`} aria-label={m.alt || m.nombre} className="group block overflow-hidden rounded-col-sm">
                  <MedioImagen medio={m} sizes="320px" ancho={480} className="h-[200px] w-full" imgClassName="group-hover:scale-[1.02]" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function VerTodo({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="-my-3 flex shrink-0 items-center gap-2 py-3 text-col-sm font-medium text-col-slate transition-colors duration-col ease-col hover:text-col-ink">
      {children}
      <ArrowRight className="h-4 w-4" strokeWidth={1.5} aria-hidden />
    </Link>
  );
}
