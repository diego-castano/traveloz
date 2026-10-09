"use client";

// Editor de páginas por bloques: la lista de bloques a la izquierda (se
// ordena arrastrando), el formulario del bloque elegido al centro y la vista
// previa a la derecha. Tocar un bloque en la vista previa lo elige; elegirlo
// en la lista lleva la vista previa hasta él. Guarda solo; publicar es aparte.

import { useCallback, useDeferredValue, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Dialog } from "radix-ui";
import {
  AlignLeft,
  ArrowLeft,
  BookOpen,
  CircleHelp,
  Columns2,
  Compass,
  Copy,
  Eye,
  EyeOff,
  Flag,
  Handshake,
  Hash,
  Heart,
  Image as ImageIcon,
  LayoutGrid,
  LoaderCircle,
  Mail,
  Map as MapIcon,
  MessageSquareQuote,
  Plus,
  Quote,
  Sparkles,
  Trash2,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import type { MedioVista } from "@/lib/collection/experiencia/contenido";
import {
  armarVistaPagina,
  nuevoBloque,
  PAGINAS,
  TIPOS_BLOQUE,
  type Bloque,
  type ContenidoPagina,
  type MapasPagina,
  type TipoBloque,
} from "@/lib/collection/paginas/contenido";
import type { PaginaDetalle } from "@/actions/collection/paginas.actions";
import { cn } from "@/components/lib/cn";
import { useCollection } from "../shell/contexto";
import { useAviso } from "../shell/Avisos";
import { Boton, Eyebrow, VerEnSitio } from "../ui";
import { apiReal, ApiProvider, type ApiConstructor } from "../constructor/api";
import { Asa, ListaOrdenable, MediosCtx } from "../constructor/campos";
import { IndicadorGuardado } from "../constructor/Constructor";
import { nuevoId } from "../constructor/estado";
import { haceTiempo } from "../constructor/formato";
import { BannerConflicto, PanelPrevia } from "../constructor/marco";
import { useAutoguardado } from "../constructor/useAutoguardado";
import { VistaPrevia } from "../constructor/VistaPrevia";
import { PaginaRender } from "../sitio/pagina/PaginaRender";
import { PaginaLegal } from "../sitio/pagina/PaginaLegal";
import { apiPaginasReal, type ApiPaginas } from "./api";
import { FormBloque, resumenBloque } from "./FormBloque";

const EASE = [0.22, 1, 0.36, 1] as const;
const LEGALES = ["terminos", "privacidad", "cookies"];
const SUGERIDOS_LEGALES: TipoBloque[] = ["texto", "imagenTexto", "cita"];
const MAX_BLOQUES = 40;

export const ICONOS_BLOQUE: Record<string, LucideIcon> = {
  Image: ImageIcon,
  Quote,
  AlignLeft,
  Columns2,
  LayoutGrid,
  MessageSquareQuote,
  Hash,
  Map: MapIcon,
  Compass,
  Sparkles,
  Users,
  Heart,
  Handshake,
  CircleHelp,
  BookOpen,
  Mail,
  Flag,
};
const INFO = Object.fromEntries(TIPOS_BLOQUE.map((t) => [t.tipo, t])) as Record<TipoBloque, (typeof TIPOS_BLOQUE)[number]>;
export const iconoBloque = (t: TipoBloque) => ICONOS_BLOQUE[INFO[t].icono] ?? AlignLeft;

export function EditorPagina({
  detalle,
  api = apiPaginasReal,
  apiMedios = apiReal,
  bloqueInicial,
  catalogoAbierto = false,
  className,
}: {
  detalle: PaginaDetalle;
  api?: ApiPaginas;
  apiMedios?: ApiConstructor;
  bloqueInicial?: string;
  catalogoAbierto?: boolean;
  className?: string;
}) {
  const { puede } = useCollection();
  const avisar = useAviso();
  const reducido = useReducedMotion();
  const puedeEditar = puede("sitio.editar");
  const legal = LEGALES.includes(detalle.slug);
  const ruta = PAGINAS.find((p) => p.slug === detalle.slug)?.ruta ?? "/";

  const [estado, setEstado] = useState({ borrador: detalle.contenido, cambios: 0 });
  const bloques = estado.borrador.bloques;
  const cambiarBloques = useCallback(
    (f: (b: Bloque[]) => Bloque[]) =>
      setEstado((s) => ({ cambios: s.cambios + 1, borrador: { ...s.borrador, bloques: f(s.borrador.bloques) } })),
    [],
  );

  const [medios, setMedios] = useState(() => new Map(detalle.mapas.medios.map((m) => [m.id, m])));
  const agregarMedios = useCallback(
    (ms: MedioVista[]) =>
      setMedios((x) => {
        const n = new Map(x);
        ms.forEach((m) => n.set(m.id, m));
        return n;
      }),
    [],
  );

  // La última revisión guardada, para publicar justo después de guardarYa
  // (el estado de React todavía no se actualizó en ese momento).
  const ultimaRevision = useRef(detalle.revision);
  const guardarCon = useCallback(
    async (input: { revision: number; borrador: ContenidoPagina }) => {
      const r = await api.guardar(detalle.slug, { revision: input.revision, contenido: input.borrador });
      if (r.ok) ultimaRevision.current = r.data.revision;
      return r;
    },
    [api, detalle.slug],
  );
  const { guardado, revision, guardarYa } = useAutoguardado({
    id: detalle.slug,
    guardarCon,
    estado,
    revisionInicial: detalle.revision,
    activo: puedeEditar,
  });
  const conflicto = guardado.tipo === "conflicto";
  const editable = puedeEditar && !conflicto;
  const [publicadoRevision, setPublicadoRevision] = useState(detalle.publicadoRevision);
  const [publicadaEn, setPublicadaEn] = useState(detalle.publicadaEn);
  const [publicando, setPublicando] = useState(false);
  const sinPublicar = revision !== publicadoRevision || guardado.tipo === "pendiente" || guardado.tipo === "guardando";

  // ── Selección ──
  const [elegido, setElegido] = useState<string | null>(bloqueInicial ?? bloques[0]?.id ?? null);
  const [pulso, setPulso] = useState(0);
  const lista = useRef<HTMLDivElement>(null);
  const centro = useRef<HTMLDivElement>(null);
  const elegirDesdeLista = (id: string) => {
    setElegido(id);
    setPulso((p) => p + 1);
    centro.current?.scrollTo({ top: 0 });
  };
  const elegirDesdePrevia = useCallback((id: string) => {
    setElegido(id);
    centro.current?.scrollTo({ top: 0 });
    lista.current?.querySelector(`[data-item-bloque="${id}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, []);
  const bloque = bloques.find((b) => b.id === elegido) ?? null;

  // ── Acciones de bloque ──
  const [catalogo, setCatalogo] = useState(catalogoAbierto);
  const agregar = (tipo: TipoBloque) => {
    const nuevo = nuevoBloque(tipo, nuevoId());
    cambiarBloques((bs) => {
      const i = bs.findIndex((b) => b.id === elegido);
      return i < 0 ? [...bs, nuevo] : [...bs.slice(0, i + 1), nuevo, ...bs.slice(i + 1)];
    });
    setCatalogo(false);
    setElegido(nuevo.id);
    setPulso((p) => p + 1);
  };
  const duplicar = (id: string) => {
    const b = bloques.find((x) => x.id === id);
    if (!b) return;
    const copia = structuredClone(b);
    copia.id = nuevoId();
    if (copia.tipo === "cifras" || copia.tipo === "estilos") for (const x of copia.items) x.id = nuevoId();
    cambiarBloques((bs) => {
      const i = bs.findIndex((x) => x.id === id);
      return [...bs.slice(0, i + 1), copia, ...bs.slice(i + 1)];
    });
    setElegido(copia.id);
    setPulso((p) => p + 1);
  };
  const eliminar = (id: string) => {
    const i = bloques.findIndex((x) => x.id === id);
    cambiarBloques((bs) => bs.filter((x) => x.id !== id));
    if (elegido === id) setElegido(bloques[i + 1]?.id ?? bloques[i - 1]?.id ?? null);
  };
  const alternarOculto = (id: string) => cambiarBloques((bs) => bs.map((b) => (b.id === id ? { ...b, oculto: !b.oculto } : b)));
  const cambiarBloque = (p: Record<string, unknown>) =>
    cambiarBloques((bs) => bs.map((b) => (b.id === elegido ? ({ ...b, ...p } as Bloque) : b)));

  // ── Publicar ──
  const publicar = async () => {
    setPublicando(true);
    const ok = await guardarYa();
    const r = ok ? await api.publicar(detalle.slug).catch(() => null) : null;
    setPublicando(false);
    if (!r?.ok) return avisar(r?.error ?? "Primero hay que guardar los últimos cambios. Revisá la conexión.", "error");
    setPublicadoRevision(ultimaRevision.current);
    setPublicadaEn(r.data.publicadaEn);
    avisar("Página publicada. Los cambios ya están en el sitio.");
  };

  // ── Vista previa ──
  const mapas = useMemo<MapasPagina>(() => ({ ...detalle.mapas, medios }), [detalle.mapas, medios]);
  const contenidoDiferido = useDeferredValue(estado.borrador);
  const mapasDiferidos = useDeferredValue(mapas);
  const vista = useMemo(
    () =>
      armarVistaPagina({ slug: detalle.slug, titulo: detalle.titulo, actualizadaEn: publicadaEn }, contenidoDiferido, mapasDiferidos, {
        incluirOcultos: true,
      }),
    [detalle.slug, detalle.titulo, publicadaEn, contenidoDiferido, mapasDiferidos],
  );
  const actualizando = contenidoDiferido !== estado.borrador;
  const pagina = legal ? (
    <PaginaLegal vista={vista} modo="preview" />
  ) : (
    <PaginaRender vista={vista} modo="preview" bloqueResaltado={elegido ?? undefined} onBloqueClick={elegirDesdePrevia} />
  );

  const Icono = bloque ? iconoBloque(bloque.tipo) : null;

  return (
    <ApiProvider value={apiMedios}>
      <MediosCtx.Provider value={{ medios, agregarMedios, editable }}>
        <div className={cn("flex min-h-0 flex-col bg-col-base lining-nums", className)}>
          {/* Barra superior */}
          <header className="flex h-16 shrink-0 items-center gap-4 border-b border-col-line bg-col-surface px-5">
            <Link
              href="/backend/collection/paginas"
              aria-label="Volver a páginas"
              className="flex h-9 w-9 items-center justify-center rounded-sm text-col-slate transition-colors hover:bg-col-base hover:text-col-ink"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
            </Link>
            <div className="min-w-0">
              <p className="truncate font-col-display text-[26px] leading-none text-col-ink">{detalle.titulo}</p>
              <p className="mt-1 truncate font-mono text-[11px] text-col-slate">collection.traveloz.com.uy{ruta}</p>
            </div>
            <span className="flex-1" />
            <div className="hidden w-[190px] md:block">
              <IndicadorGuardado g={guardado} editable={puedeEditar} />
            </div>
            <p className="hidden items-center gap-2 text-[12px] text-col-slate xl:flex">
              {sinPublicar ? (
                <>
                  <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-col-gold" /> Cambios sin publicar
                </>
              ) : publicadaEn ? (
                `Publicada ${haceTiempo(publicadaEn)}`
              ) : null}
            </p>
            {publicadaEn && <VerEnSitio ruta={ruta} className="hidden shrink-0 text-col-slate hover:text-col-ink sm:inline-flex" />}
            {puedeEditar && (
              <Boton tam="sm" disabled={!sinPublicar || publicando || conflicto} onClick={() => void publicar()}>
                {publicando && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
                Publicar cambios
              </Boton>
            )}
          </header>
          <BannerConflicto visible={conflicto} />
          {!puedeEditar && (
            <p className="shrink-0 border-b border-col-line bg-col-surface px-6 py-2.5 text-[13px] text-col-slate">
              Estás viendo esta página en modo lectura: tu usuario no tiene permiso para editar el sitio.
            </p>
          )}

          <div className="flex min-h-0 flex-1">
            {/* Lista de bloques */}
            <aside className="flex w-[300px] shrink-0 flex-col border-r border-col-line bg-col-surface">
              <div className="flex items-center justify-between px-5 pb-3 pt-5">
                <p className="text-[11px] uppercase tracking-[0.16em] text-col-slate">
                  Bloques <span className="tabular-nums text-col-slate/60">{bloques.length}</span>
                </p>
              </div>
              <div ref={lista} className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
                <ListaOrdenable
                  items={bloques}
                  deshabilitado={!editable}
                  onOrden={(bs) => cambiarBloques(() => bs)}
                  className="flex flex-col gap-1"
                  render={(b, _i, asa) => (
                    <ItemBloque
                      b={b}
                      activo={b.id === elegido}
                      editable={editable}
                      asa={asa}
                      onElegir={() => elegirDesdeLista(b.id)}
                      onOcultar={() => alternarOculto(b.id)}
                      onDuplicar={() => duplicar(b.id)}
                      onEliminar={() => eliminar(b.id)}
                    />
                  )}
                />
              </div>
              {editable && (
                <div className="border-t border-col-line p-3">
                  <Boton
                    variante="secundario"
                    tam="sm"
                    className="w-full"
                    disabled={bloques.length >= MAX_BLOQUES}
                    onClick={() => setCatalogo(true)}
                  >
                    <Plus className="h-4 w-4" strokeWidth={1.5} /> Agregar bloque
                  </Boton>
                </div>
              )}
            </aside>

            {/* Formulario */}
            <div ref={centro} className="min-h-0 min-w-0 flex-1 overflow-y-auto">
              {bloque && Icono ? (
                <motion.div
                  key={bloque.id}
                  initial={reducido ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, ease: EASE }}
                  className="mx-auto w-full max-w-[680px] px-6 pb-20 pt-10 md:px-10"
                >
                  <header className="mb-10 flex items-start gap-5">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-sm bg-col-ink text-col-gold">
                      <Icono className="h-5 w-5" strokeWidth={1.4} aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <Eyebrow>Bloque {bloques.findIndex((b) => b.id === bloque.id) + 1} de {bloques.length}</Eyebrow>
                      <h2 className="mt-3 font-col-display text-[40px] font-normal leading-[1.05] text-col-ink">{INFO[bloque.tipo].nombre}</h2>
                      <p className="mt-1 text-[15px] text-col-slate">{INFO[bloque.tipo].descripcion}</p>
                    </div>
                    {bloque.oculto && (
                      <span className="mt-1 flex items-center gap-1.5 rounded-sm border border-col-line px-2 py-1 text-[11px] uppercase tracking-[0.12em] text-col-slate">
                        <EyeOff className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden /> Oculto
                      </span>
                    )}
                  </header>
                  <fieldset disabled={!editable} className="m-0 min-w-0 border-0 p-0">
                    <legend className="sr-only">{INFO[bloque.tipo].nombre}</legend>
                    <FormBloque key={bloque.id} bloque={bloque} onCambio={cambiarBloque} mapas={mapas} editable={editable} />
                  </fieldset>
                </motion.div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-5 px-8 text-center">
                  <p className="max-w-[22ch] font-col-display text-[34px] leading-tight text-col-ink">
                    {bloques.length ? "Elegí un bloque para editarlo." : "Esta página todavía no tiene bloques."}
                  </p>
                  {editable && !bloques.length && (
                    <Boton onClick={() => setCatalogo(true)}>
                      <Plus className="h-4 w-4" strokeWidth={1.5} /> Agregar el primero
                    </Boton>
                  )}
                </div>
              )}
            </div>

            <PanelPrevia
              clave="col.paginas.previa"
              render={(c) => (
                <VistaPrevia
                  {...c}
                  selector={elegido ? `[data-bloque="${elegido}"]` : undefined}
                  pulso={pulso}
                  titulo={bloque ? `${INFO[bloque.tipo].nombre}${bloque.oculto ? " (oculto)" : ""}` : detalle.titulo}
                  actualizando={actualizando}
                >
                  {pagina}
                </VistaPrevia>
              )}
            />
          </div>
        </div>

        <Catalogo abierto={catalogo} onCerrar={() => setCatalogo(false)} onElegir={agregar} legal={legal} />
      </MediosCtx.Provider>
    </ApiProvider>
  );
}

// ── Lista ───────────────────────────────────────────────────────────────────

function ItemBloque({
  b,
  activo,
  editable,
  asa,
  onElegir,
  onOcultar,
  onDuplicar,
  onEliminar,
}: {
  b: Bloque;
  activo: boolean;
  editable: boolean;
  asa: Parameters<typeof Asa>[0]["asa"];
  onElegir: () => void;
  onOcultar: () => void;
  onDuplicar: () => void;
  onEliminar: () => void;
}) {
  const [confirmar, setConfirmar] = useState(false);
  const Icono = iconoBloque(b.tipo);
  const resumen = resumenBloque(b);
  const accion = "flex h-7 w-7 items-center justify-center rounded-sm text-col-slate transition-colors hover:bg-col-base hover:text-col-ink";

  return (
    <div
      data-item-bloque={b.id}
      onMouseLeave={() => setConfirmar(false)}
      className={cn(
        "group relative flex items-center gap-2 rounded-sm border py-2 pl-1 pr-2 transition-[background-color,border-color,box-shadow] duration-200 ease-col",
        activo ? "border-col-ink/80 bg-col-base" : "border-transparent hover:bg-col-base/60",
        asa.arrastrando && "border-col-line bg-col-surface shadow-[0_16px_32px_-16px_rgba(50,55,59,0.5)]",
      )}
    >
      {activo && <span aria-hidden className="absolute inset-y-2 left-0 w-0.5 bg-col-gold" />}
      {editable ? <Asa asa={asa} label={INFO[b.tipo].nombre} /> : <span className="w-2" />}
      <button type="button" onClick={onElegir} aria-current={activo ? "true" : undefined} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border",
            activo ? "border-col-ink bg-col-ink text-col-gold" : "border-col-line bg-col-surface text-col-slate",
          )}
        >
          <Icono className="h-4 w-4" strokeWidth={1.5} aria-hidden />
        </span>
        <span className={cn("min-w-0 flex-1", b.oculto && "opacity-50")}>
          <span className="flex items-center gap-1.5 text-[13.5px] text-col-ink">
            {INFO[b.tipo].nombre}
            {b.oculto && <EyeOff className="h-3 w-3 text-col-slate" strokeWidth={1.75} aria-label="Oculto" />}
          </span>
          <span className={cn("block truncate text-[12px]", resumen ? "text-col-slate" : "italic text-col-slate/50")}>
            {resumen || "Sin contenido"}
          </span>
        </span>
      </button>
      {editable &&
        (confirmar ? (
          <span className="absolute inset-y-1 right-1 flex items-center gap-1 rounded-sm bg-col-surface pl-2 shadow-[-12px_0_12px_-6px_#fff]">
            <button
              type="button"
              onClick={onEliminar}
              className="h-7 rounded-sm bg-col-alerta px-2 text-[11px] uppercase tracking-[0.1em] text-col-base"
            >
              Eliminar
            </button>
            <button type="button" aria-label="Cancelar" onClick={() => setConfirmar(false)} className={accion}>
              <X className="h-3.5 w-3.5" strokeWidth={1.75} />
            </button>
          </span>
        ) : (
          <span className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-0.5 rounded-sm bg-col-base opacity-0 transition-opacity duration-200 ease-col focus-within:opacity-100 group-hover:opacity-100">
            <button type="button" onClick={onOcultar} aria-label={b.oculto ? "Mostrar" : "Ocultar"} title={b.oculto ? "Mostrar" : "Ocultar"} className={accion}>
              {b.oculto ? <Eye className="h-3.5 w-3.5" strokeWidth={1.5} /> : <EyeOff className="h-3.5 w-3.5" strokeWidth={1.5} />}
            </button>
            <button type="button" onClick={onDuplicar} aria-label="Duplicar" title="Duplicar" className={accion}>
              <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
            <button type="button" onClick={() => setConfirmar(true)} aria-label="Eliminar" title="Eliminar" className={cn(accion, "hover:text-col-alerta")}>
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          </span>
        ))}
    </div>
  );
}

// ── Catálogo ────────────────────────────────────────────────────────────────

function Catalogo({
  abierto,
  onCerrar,
  onElegir,
  legal,
}: {
  abierto: boolean;
  onCerrar: () => void;
  onElegir: (t: TipoBloque) => void;
  legal: boolean;
}) {
  const { raiz } = useCollection();
  const sugeridos = legal ? TIPOS_BLOQUE.filter((t) => SUGERIDOS_LEGALES.includes(t.tipo)) : [];
  const resto = legal ? TIPOS_BLOQUE.filter((t) => !SUGERIDOS_LEGALES.includes(t.tipo)) : TIPOS_BLOQUE;
  const grilla = (items: typeof TIPOS_BLOQUE, i0 = 0) => (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      {items.map((t, i) => {
        const Icono = ICONOS_BLOQUE[t.icono] ?? AlignLeft;
        return (
          <motion.button
            key={t.tipo}
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE, delay: Math.min(i0 + i, 16) * 0.015 }}
            onClick={() => onElegir(t.tipo)}
            className="group flex flex-col items-start gap-4 rounded-sm border border-col-line bg-col-surface p-4 text-left transition-[border-color,transform,box-shadow] duration-200 ease-col hover:-translate-y-0.5 hover:border-col-ink/40 hover:shadow-[0_16px_32px_-20px_rgba(50,55,59,0.45)] active:scale-[0.98]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-sm bg-col-base text-col-slate transition-colors duration-200 group-hover:bg-col-ink group-hover:text-col-gold">
              <Icono className="h-[18px] w-[18px]" strokeWidth={1.4} aria-hidden />
            </span>
            <span>
              <span className="block font-col-display text-[21px] leading-tight text-col-ink">{t.nombre}</span>
              <span className="mt-1 block text-[12.5px] leading-snug text-col-slate">{t.descripcion}</span>
            </span>
          </motion.button>
        );
      })}
    </div>
  );
  return (
    <Dialog.Root open={abierto} onOpenChange={(o) => !o && onCerrar()}>
      <AnimatePresence>
        {abierto && (
          <Dialog.Portal forceMount container={raiz}>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-[60] bg-col-ink/40 backdrop-blur-[2px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount aria-describedby={undefined}>
              <motion.div
                className="fixed inset-0 z-[60] m-auto flex h-fit max-h-[calc(100dvh-48px)] w-[min(1180px,calc(100vw-32px))] flex-col overflow-hidden rounded bg-col-base shadow-[0_40px_120px_-40px_rgba(50,55,59,0.6)] focus:outline-none"
                initial={{ opacity: 0, y: 16, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.99 }}
                transition={{ duration: 0.4, ease: EASE }}
              >
                <div className="flex items-start justify-between gap-6 px-8 pb-6 pt-8">
                  <div>
                    <Eyebrow>Agregar bloque</Eyebrow>
                    <Dialog.Title className="mt-3 font-col-display text-[38px] font-normal leading-none text-col-ink">
                      ¿Qué querés sumar?
                    </Dialog.Title>
                    <p className="mt-2 text-[14px] text-col-slate">Se agrega debajo del bloque elegido.</p>
                  </div>
                  <Dialog.Close
                    aria-label="Cerrar"
                    className="flex h-10 w-10 items-center justify-center rounded-sm text-col-slate hover:bg-col-surface hover:text-col-ink"
                  >
                    <X className="h-5 w-5" strokeWidth={1.5} />
                  </Dialog.Close>
                </div>
                <div className="min-h-0 overflow-y-auto px-8 pb-8">
                  {legal && (
                    <>
                      <p className="mb-3 text-[11px] uppercase tracking-[0.16em] text-col-slate">Para una página legal</p>
                      {grilla(sugeridos)}
                      <p className="mb-3 mt-8 text-[11px] uppercase tracking-[0.16em] text-col-slate">Todos los bloques</p>
                    </>
                  )}
                  {grilla(resto, sugeridos.length)}
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
