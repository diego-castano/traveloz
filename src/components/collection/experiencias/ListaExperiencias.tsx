"use client";

// Grilla de experiencias de Collection: tarjetas con portada, estado y
// completitud; filtros por estado, búsqueda, orden arrastrando (con el
// filtro "Todas") y menú por tarjeta.

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { DropdownMenu } from "radix-ui";
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Archive, Copy, LoaderCircle, MoreHorizontal, Plus, Star } from "lucide-react";
import {
  alternarDestacada,
  cambiarEstadoExperiencia,
  crearExperiencia,
  duplicarExperiencia,
  listarExperiencias,
  reordenarExperiencias,
  type ExperienciaItem,
} from "@/actions/collection/experiencias.actions";
import type { EstadoExperiencia } from "@/lib/collection/experiencia/contenido";
import { cn } from "@/components/lib/cn";
import { useCollection } from "../shell/contexto";
import { useAviso } from "../shell/Avisos";
import { AnilloCompletitud, Boton, Buscador, EncabezadoPagina, Estado, Filtros, barraHerramientas, tarjetaElevable } from "../ui";
import { AsaTarjeta } from "../contenido/comun";
import { MedioImagen } from "../sitio/medios";
import { EstadoPill } from "../constructor/formato";
import { useSensoresOrden } from "../constructor/campos";

const EASE = [0.22, 1, 0.36, 1] as const;

type Filtro = "todas" | EstadoExperiencia;
const FILTROS: { id: Filtro; label: string }[] = [
  { id: "todas", label: "Todas" },
  { id: "BORRADOR", label: "Borradores" },
  { id: "EN_REVISION", label: "En revisión" },
  { id: "PUBLICADA", label: "Publicadas" },
  { id: "PAUSADA", label: "Pausadas" },
  { id: "ARCHIVADA", label: "Archivadas" },
];

const plural = (n: number, a: string, b: string) => `${n} ${n === 1 ? a : b}`;

export function ListaExperiencias({
  inicial,
  nuevaAlEntrar = false,
}: {
  inicial: ExperienciaItem[] | { error: string };
  /** Desde la paleta ("Nueva experiencia"): la crea al entrar y abre el constructor. */
  nuevaAlEntrar?: boolean;
}) {
  const router = useRouter();
  const avisar = useAviso();
  const { puede, raiz } = useCollection();
  const editable = puede("experiencias.editar");
  const publica = puede("experiencias.publicar");

  const [items, setItems] = useState<ExperienciaItem[]>(Array.isArray(inicial) ? inicial : []);
  const [archivadas, setArchivadas] = useState<ExperienciaItem[] | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [q, setQ] = useState("");
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState<string | null>(Array.isArray(inicial) ? null : inicial.error);
  const sensores = useSensoresOrden();

  const elegirFiltro = async (f: Filtro) => {
    setFiltro(f);
    if (f === "ARCHIVADA" && !archivadas) {
      const r = await listarExperiencias({ estado: "ARCHIVADA" });
      if (r.ok) setArchivadas(r.data);
      else setError(r.error);
    }
  };

  const visibles = useMemo(() => {
    const base = filtro === "ARCHIVADA" ? archivadas ?? [] : items.filter((x) => filtro === "todas" || x.estado === filtro);
    const t = q.trim().toLowerCase();
    return t ? base.filter((x) => x.titulo.toLowerCase().includes(t) || (x.slug ?? "").includes(t)) : base;
  }, [items, archivadas, filtro, q]);
  const ordenable = editable && filtro === "todas" && !q.trim();

  const nueva = async () => {
    setCreando(true);
    const r = await crearExperiencia();
    if (!r.ok) {
      setCreando(false);
      avisar(r.error, "error");
      return;
    }
    router.push(`/backend/collection/experiencias/${r.data.id}`);
  };

  const yaCreada = useRef(false);
  useEffect(() => {
    if (!nuevaAlEntrar || !editable || yaCreada.current) return;
    yaCreada.current = true;
    // Saca el ?nueva=1 primero: recargar no crea otra.
    router.replace("/backend/collection/experiencias");
    void nueva();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nuevaAlEntrar, editable]);

  const alSoltar = async (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const de = items.findIndex((x) => x.id === e.active.id);
    const a = items.findIndex((x) => x.id === e.over!.id);
    const previo = items;
    const nuevo = arrayMove(items, de, a);
    setItems(nuevo);
    const r = await reordenarExperiencias(nuevo.map((x) => x.id));
    if (!r.ok) {
      setItems(previo);
      avisar(r.error, "error");
    }
  };

  const duplicar = async (x: ExperienciaItem) => {
    const r = await duplicarExperiencia(x.id);
    if (!r.ok) return avisar(r.error, "error");
    avisar("Copia creada.");
    router.push(`/backend/collection/experiencias/${r.data.id}`);
  };
  const destacar = async (x: ExperienciaItem) => {
    const r = await alternarDestacada(x.id);
    if (!r.ok) return avisar(r.error, "error");
    setItems((l) => l.map((y) => (y.id === x.id ? { ...y, destacada: r.data.destacada } : y)));
  };
  const archivar = async (x: ExperienciaItem) => {
    const r = await cambiarEstadoExperiencia(x.id, "archivar");
    if (!r.ok) return avisar(r.error, "error");
    setItems((l) => l.filter((y) => y.id !== x.id));
    setArchivadas((l) => (l ? [{ ...x, estado: "ARCHIVADA" }, ...l] : l));
    avisar("Experiencia archivada.");
  };

  const conteo = (f: Filtro) =>
    f === "todas" ? items.length : f === "ARCHIVADA" ? archivadas?.length : items.filter((x) => x.estado === f).length;

  return (
    <div className="mx-auto max-w-[1600px]">
      <EncabezadoPagina
        titulo="Los viajes de Collection"
        descripcion={
          items.length
            ? `${plural(items.length, "experiencia", "experiencias")} · ${items.filter((x) => x.estado === "PUBLICADA").length} en el sitio`
            : "Cada viaje se arma paso a paso, con vista previa."
        }
        acciones={
          editable &&
          items.length > 0 && (
            <Boton onClick={() => void nueva()} disabled={creando}>
              {creando ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" strokeWidth={1.5} />}
              Nueva experiencia
            </Boton>
          )
        }
      />
      {/* Sin ninguna experiencia, filtros y buscador no dicen nada: se ocultan. */}
      {(items.length > 0 || filtro !== "todas") && (
        <div className={barraHerramientas}>
          <Filtros
            etiqueta="Estado"
            opciones={FILTROS.map((f) => ({ ...f, n: conteo(f.id) }))}
            valor={filtro}
            onChange={(f) => void elegirFiltro(f)}
          />
          <Buscador valor={q} onChange={setQ} placeholder="Buscar por título" etiqueta="Buscar experiencias" />
        </div>
      )}

      {error && (
        <p role="alert" className="mb-6 text-col-md text-col-alerta">
          {error}
        </p>
      )}

      {visibles.length === 0 ? (
        <Vacia
          hayAlgo={items.length > 0 || filtro !== "todas"}
          editable={editable}
          onNueva={() => void nueva()}
          onTodas={() => {
            setFiltro("todas");
            setQ("");
          }}
          creando={creando}
        />
      ) : (
        <DndContext sensors={sensores} collisionDetection={closestCenter} onDragEnd={(e) => void alSoltar(e)}>
          <SortableContext items={visibles.map((x) => x.id)} strategy={rectSortingStrategy} disabled={!ordenable}>
            <ul className="grid grid-cols-1 gap-y-3 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-10 lg:grid-cols-3 xl:grid-cols-4">
              <AnimatePresence initial={false}>
                {visibles.map((x, i) => (
                  <Tarjeta
                    key={x.id}
                    x={x}
                    i={i}
                    ordenable={ordenable}
                    raiz={raiz}
                    menu={{
                      duplicar: editable ? () => void duplicar(x) : null,
                      destacar: editable ? () => void destacar(x) : null,
                      archivar: publica && x.estado !== "ARCHIVADA" ? () => void archivar(x) : null,
                    }}
                  />
                ))}
              </AnimatePresence>
            </ul>
          </SortableContext>
        </DndContext>
      )}
      {ordenable && visibles.length > 1 && (
        <p className="mt-12 text-center text-col-sm text-col-muted">
          Arrastrá las tarjetas para cambiar el orden en el sitio.
        </p>
      )}
    </div>
  );
}

function Tarjeta({
  x,
  i,
  ordenable,
  raiz,
  menu,
}: {
  x: ExperienciaItem;
  i: number;
  ordenable: boolean;
  raiz: HTMLElement | null;
  menu: { duplicar: (() => void) | null; destacar: (() => void) | null; archivar: (() => void) | null };
}) {
  const orden = useSortable({ id: x.id, disabled: !ordenable });
  const { setNodeRef, transform, transition, isDragging } = orden;
  const [confirmar, setConfirmar] = useState(false);
  const hayMenu = menu.duplicar || menu.destacar || menu.archivar;
  const destinos = x.destinos.map((d) => d.nombre).join(", ");

  return (
    <motion.li
      ref={setNodeRef}
      layout={!isDragging}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.5, ease: EASE, delay: Math.min(i, 8) * 0.03 }}
      style={{ transform: CSS.Translate.toString(transform), transition, zIndex: isDragging ? 20 : undefined }}
      className="group relative"
    >
      <Link
        href={`/backend/collection/experiencias/${x.id}`}
        aria-label={`Abrir ${x.titulo || "experiencia sin título"}`}
        // En celular, fila compacta (miniatura de 72 px, título y estado); desde sm, tarjeta.
        className="flex items-center gap-4 rounded-col-sm bg-col-surface p-2 pr-24 sm:block sm:bg-transparent sm:p-0"
      >
        <div
          className={cn(
            "relative aspect-square w-[72px] shrink-0 overflow-hidden rounded-col-sm bg-col-line sm:aspect-[4/3] sm:w-auto",
            isDragging ? "shadow-col-2" : tarjetaElevable,
          )}
        >
          {x.portada ? (
            <MedioImagen
              medio={x.portada}
              relleno
              sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 72px"
              imgClassName="group-hover:scale-[1.03]"
            />
          ) : (
            // Sin portada: un lienzo claro con el anillo de completitud, que invita a seguir.
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 border border-dashed border-col-slate/25 bg-[radial-gradient(120%_80%_at_30%_15%,#FFFFFF_0%,#F4F4F4_55%,#E9EAEA_100%)] text-col-ink">
              <AnilloCompletitud valor={x.completitud} tam={64} className="hidden sm:inline-flex" />
              <span className="hidden text-col-sm font-medium text-col-slate sm:block">Falta la portada</span>
            </div>
          )}
          <div className="absolute left-3 top-3 hidden items-center gap-1.5 sm:flex">
            <EstadoPill estado={x.estado} className="shadow-col-1" />
            {x.completitud < 1 && (
              <Estado tono="neutro" className="tabular-nums shadow-col-1" title="Completitud">
                {Math.round(x.completitud * 100)} %
              </Estado>
            )}
            {x.destacada && (
              <span className="flex h-6 w-6 items-center justify-center rounded-col-sm bg-col-ink/70 backdrop-blur-sm" title="Destacada">
                <Star className="h-3 w-3 fill-col-gold text-col-gold" strokeWidth={1.5} aria-label="Destacada" />
              </span>
            )}
          </div>
          {x.portada && x.completitud < 1 && (
            <div className="absolute inset-x-0 bottom-0 h-0.5 bg-col-ink/25" aria-label={`${Math.round(x.completitud * 100)} por ciento completa`}>
              <div className="h-full bg-col-gold" style={{ width: `${x.completitud * 100}%` }} />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 sm:mt-4">
          {x.titulo ? (
            <p className="line-clamp-2 font-col-display text-col-xl leading-[1.1] text-col-ink sm:line-clamp-none sm:text-col-2xl">{x.titulo}</p>
          ) : (
            <p className="font-col-display text-col-xl italic leading-[1.1] text-col-subtle sm:text-col-2xl">Sin título</p>
          )}
          <p className="mt-1.5 flex items-center gap-2 sm:hidden">
            <EstadoPill estado={x.estado} />
            {x.completitud < 1 && <span className="text-col-xs tabular-nums text-col-muted">{Math.round(x.completitud * 100)} %</span>}
          </p>
          <p className="mt-2 hidden items-center gap-2 text-col-sm text-col-slate sm:flex">
            <span className="truncate">
              {[destinos || null, x.noches ? plural(x.noches, "noche", "noches") : null].filter(Boolean).join(" · ") || "Sin destino"}
            </span>
            {x.hayCambiosSinPublicar && (
              <Estado tono="aviso" className="shrink-0">
                Cambios sin publicar
              </Estado>
            )}
          </p>
        </div>
      </Link>
      {ordenable && (
        <AsaTarjeta
          nombre={x.titulo || "experiencia sin título"}
          orden={orden}
          className={cn("top-1/2 -translate-y-1/2 sm:top-3 sm:translate-y-0", hayMenu && "right-[52px]")}
        />
      )}
      {hayMenu && (
        <DropdownMenu.Root onOpenChange={(o) => !o && setConfirmar(false)}>
          <DropdownMenu.Trigger
            aria-label={`Opciones de ${x.titulo || "la experiencia"}`}
            className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-col bg-col-surface/95 sm:top-3 sm:translate-y-0 text-col-ink opacity-70 shadow-col-1 backdrop-blur-sm transition-opacity duration-col ease-col hover:bg-col-surface focus-visible:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100 [@media(hover:none)]:opacity-100"
          >
            <MoreHorizontal className="h-4 w-4" strokeWidth={1.5} />
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal container={raiz}>
            <DropdownMenu.Content
              align="end"
              sideOffset={6}
              className="z-50 min-w-[200px] rounded-col-sm border border-col-line bg-col-surface p-1 shadow-col-3"
            >
              {menu.duplicar && (
                <ItemMenu onSelect={menu.duplicar} icono={<Copy />}>
                  Duplicar
                </ItemMenu>
              )}
              {menu.destacar && (
                <ItemMenu onSelect={menu.destacar} icono={<Star />}>
                  {x.destacada ? "Quitar destacada" : "Destacar"}
                </ItemMenu>
              )}
              {menu.archivar &&
                (confirmar ? (
                  <ItemMenu onSelect={menu.archivar} icono={<Archive />} peligro>
                    Sí, archivar
                  </ItemMenu>
                ) : (
                  <ItemMenu
                    onSelect={(e) => {
                      e.preventDefault();
                      setConfirmar(true);
                    }}
                    icono={<Archive />}
                  >
                    Archivar
                  </ItemMenu>
                ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      )}
    </motion.li>
  );
}

function ItemMenu({
  onSelect,
  icono,
  peligro,
  children,
}: {
  onSelect: (e: Event) => void;
  icono: React.ReactElement;
  peligro?: boolean;
  children: React.ReactNode;
}) {
  return (
    <DropdownMenu.Item
      onSelect={onSelect}
      className={cn(
        "flex h-10 cursor-pointer items-center gap-3 rounded-col-sm px-3 text-col-md outline-none data-[highlighted]:bg-col-base [&>svg]:h-4 [&>svg]:w-4 [&>svg]:stroke-[1.5]",
        peligro ? "text-col-alerta" : "text-col-ink",
      )}
    >
      {icono}
      {children}
    </DropdownMenu.Item>
  );
}

function Vacia({
  hayAlgo,
  editable,
  onNueva,
  onTodas,
  creando,
}: {
  hayAlgo: boolean;
  editable: boolean;
  onNueva: () => void;
  onTodas: () => void;
  creando: boolean;
}) {
  if (hayAlgo) {
    return (
      <div className="flex flex-col items-center py-24 text-center">
        <p className="font-col-display text-col-2xl italic text-col-slate">Nada con ese filtro.</p>
        <Boton variante="secundario" tam="sm" className="mt-6" onClick={onTodas}>
          Ver todas
        </Boton>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 items-center gap-12 py-10 lg:grid-cols-[1.1fr_1fr]">
      <div className="grid grid-cols-3 gap-3" aria-hidden>
        {[
          ["#3E7C86", "row-span-2 aspect-[4/7]"],
          ["#C9A57A", "aspect-[4/5]"],
          ["#8A6B52", "aspect-[4/5]"],
          ["#2F6E73", "aspect-[4/5]"],
          ["#B79C78", "aspect-[4/5]"],
        ].map(([c, cls], i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: i * 0.08 }}
            className={cn("rounded-col-sm", cls)}
            style={{
              background: `radial-gradient(120% 90% at 28% 18%, rgba(255,255,255,0.28), rgba(255,255,255,0) 58%), linear-gradient(165deg, ${c} 0%, color-mix(in srgb, ${c} 62%, #32373B) 100%)`,
            }}
          />
        ))}
      </div>
      <div>
        <p className="font-col-display text-col-display font-light leading-[1.05] text-col-ink">
          Acá van a vivir los viajes de Collection.
        </p>
        <p className="mt-5 max-w-[46ch] text-col-cuerpo leading-relaxed text-col-slate">
          Cada experiencia se arma paso a paso, con fotos de la biblioteca y una vista previa que se actualiza mientras
          escribís.
        </p>
        {editable && (
          <Boton className="mt-8" onClick={onNueva} disabled={creando}>
            {creando ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" strokeWidth={1.5} />}
            Nueva experiencia
          </Boton>
        )}
      </div>
    </div>
  );
}
