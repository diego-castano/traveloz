import type { Metadata } from "next";
import Link from "next/link";
import { TarjetaExperiencia } from "@/components/collection/sitio/tarjetas";
import { CabeceraPagina, EstadoVacio, RaizSitio } from "@/components/collection/sitio/chrome/piezas";
import { destinosPublicados, experienciasPublicadas } from "@/lib/collection/sitio-datos";
import { metaSitio } from "@/lib/collection/sitio";
import { TIPOS_EXPERIENCIA, type TipoExperiencia } from "@/lib/collection/experiencia/contenido";
import { cn } from "@/components/lib/cn";

const NOMBRE_TIPO: Record<TipoExperiencia, string> = { VIAJE: "Viajes", HOTEL: "Hoteles", CRUCERO: "Cruceros", TREN: "Trenes" };
const BAJADA = "Viajes de autor, hoteles, cruceros y trenes. Cada uno lo diseña y lo acompaña un especialista.";

export const metadata: Metadata = metaSitio({ titulo: "Experiencias", descripcion: BAJADA, ruta: "/experiencias" });

type Filtros = { destino?: string; tipo?: string };

export default async function Experiencias({ searchParams }: { searchParams: Filtros }) {
  const tipo = TIPOS_EXPERIENCIA.find((t) => t === searchParams.tipo);
  const [todas, destinos] = await Promise.all([experienciasPublicadas(), destinosPublicados()]);
  const destino = destinos.find((d) => d.slug === searchParams.destino);
  const lista = await experienciasPublicadas({ destinoSlug: destino?.slug, tipo });

  // Solo se ofrecen los filtros que tienen algo detrás.
  const destinosConExp = destinos.filter((d) => d.experiencias > 0);
  const tipos = TIPOS_EXPERIENCIA.filter((t) => todas.some((e) => e.tipo === t));
  const href = (f: Filtros) => {
    const q = new URLSearchParams();
    if (f.destino) q.set("destino", f.destino);
    if (f.tipo) q.set("tipo", f.tipo);
    const s = q.toString();
    return s ? `/experiencias?${s}` : "/experiencias";
  };

  return (
    <RaizSitio>
      <CabeceraPagina titulo="Experiencias" bajada={BAJADA}>
        {todas.length > 0 && (destinosConExp.length > 1 || tipos.length > 1) && (
          <div className="mt-4 flex flex-col gap-5">
            {destinosConExp.length > 1 && (
              <GrupoChips etiqueta="Destino">
                <Chip href={href({ tipo })} activo={!destino}>Todos</Chip>
                {destinosConExp.map((d) => (
                  <Chip key={d.id} href={href({ destino: d.slug, tipo })} activo={destino?.id === d.id}>
                    {d.nombre}
                  </Chip>
                ))}
              </GrupoChips>
            )}
            {tipos.length > 1 && (
              <GrupoChips etiqueta="Tipo">
                <Chip href={href({ destino: destino?.slug })} activo={!tipo}>Todos</Chip>
                {tipos.map((t) => (
                  <Chip key={t} href={href({ destino: destino?.slug, tipo: t })} activo={tipo === t}>
                    {NOMBRE_TIPO[t]}
                  </Chip>
                ))}
              </GrupoChips>
            )}
          </div>
        )}
      </CabeceraPagina>

      {lista.length ? (
        <section className="cs-bloque">
          <div className="cs-envolvente">
            <div className="cs-tarjetas">
              {lista.map((e) => (
                <TarjetaExperiencia key={e.id} e={e} />
              ))}
            </div>
          </div>
        </section>
      ) : todas.length ? (
        <EstadoVacio
          titulo="Nada con esa combinación, por ahora."
          texto="Probá con otro destino o tipo de viaje, o contanos qué buscás y un especialista lo arma para vos."
        />
      ) : (
        <EstadoVacio
          titulo="Las primeras experiencias están en camino."
          texto="Mientras terminamos de prepararlas, contanos qué viaje tenés en mente y un especialista lo diseña con vos."
        />
      )}
    </RaizSitio>
  );
}

function GrupoChips({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-baseline sm:gap-6">
      <span className="w-20 shrink-0 text-[12px] uppercase tracking-[0.14em] text-col-slate">{etiqueta}</span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Chip({ href, activo, children }: { href: string; activo: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={activo ? "true" : undefined}
      className={cn(
        "inline-flex h-10 items-center rounded-sm border px-4 text-[13px] tracking-[0.04em] transition-colors duration-200 ease-col",
        activo
          ? "border-col-ink bg-col-ink text-col-base"
          : "border-col-line bg-col-surface text-col-ink hover:border-col-ink",
      )}
    >
      {children}
    </Link>
  );
}
