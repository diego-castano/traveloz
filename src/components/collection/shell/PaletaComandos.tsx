"use client";

// Paleta ⌘K: buscar contenido (experiencias, destinos, artículos, páginas y
// especialistas), hacer algo ("Nueva experiencia", "Subir fotos") o saltar a
// un módulo. Sin texto muestra lo último que se abrió desde acá. Todo con
// teclado: flechas para moverte, Enter para abrir, Esc para cerrar.

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { motion, useAnimate } from "motion/react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  ArrowLeft,
  BookOpen,
  Clock,
  Compass,
  CornerDownLeft,
  LoaderCircle,
  MapPinned,
  PanelsTopLeft,
  Plus,
  Search,
  Settings2,
  Upload,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import type { GrupoBusqueda, ResultadoBusqueda } from "@/actions/collection/buscar.actions";
import type { Resultado } from "@/lib/collection/ejecutar";
import { PAGINAS } from "@/lib/collection/paginas/contenido";
import { useCollection } from "./contexto";
import { GRUPOS_NAV } from "./nav";
import { DUR, EASE } from "../movimiento";

export type BuscarCollection = (q: string) => Promise<Resultado<ResultadoBusqueda[]>>;

const CLAVE_RECIENTES = "col.paleta.recientes";
const MAX_RECIENTES = 6;

const GRUPOS: { id: GrupoBusqueda; titulo: string; icono: LucideIcon }[] = [
  { id: "experiencias", titulo: "Experiencias", icono: Compass },
  { id: "destinos", titulo: "Destinos", icono: MapPinned },
  { id: "articulos", titulo: "Journal", icono: BookOpen },
  { id: "paginas", titulo: "Páginas", icono: PanelsTopLeft },
  { id: "especialistas", titulo: "Especialistas", icono: UserRound },
];
const ICONO_GRUPO = Object.fromEntries(GRUPOS.map((g) => [g.id, g.icono])) as Record<GrupoBusqueda, LucideIcon>;

/** Sin tildes ni mayúsculas, para comparar lo que se escribe con los nombres. */
const normal = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// El fondo del elegido no es de cada fila: es una sola pieza (Resaltado) que
// se desliza de una fila a otra en 250.
const item =
  "relative isolate flex min-h-11 cursor-pointer items-center gap-3 rounded-col-sm px-3 py-1.5 text-col-cuerpo text-col-slate transition-colors duration-col-rapido ease-col data-[disabled=true]:cursor-default data-[disabled=true]:opacity-45 data-[selected=true]:text-col-ink";

const ElegidoCtx = createContext("");

function Resaltado({ valor }: { valor: string }) {
  if (useContext(ElegidoCtx) !== valor) return null;
  return (
    <motion.span
      layoutId="col-paleta-elegido"
      aria-hidden
      className="absolute inset-0 -z-10 rounded-col-sm bg-col-base"
      transition={{ duration: DUR.fast, ease: EASE }}
    />
  );
}
const grupo =
  "[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-col-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-col-muted";

function leerRecientes(): ResultadoBusqueda[] {
  try {
    const r = JSON.parse(localStorage.getItem(CLAVE_RECIENTES) ?? "[]");
    return Array.isArray(r) ? r.slice(0, MAX_RECIENTES) : [];
  } catch {
    return [];
  }
}

export function PaletaComandos({
  abierta,
  onAbiertaChange,
  superAdmin,
  buscar,
}: {
  abierta: boolean;
  onAbiertaChange: (v: boolean) => void;
  superAdmin: boolean;
  buscar: BuscarCollection;
}) {
  const router = useRouter();
  const { raiz, puede } = useCollection();
  const [texto, setTexto] = useState("");
  const [resultados, setResultados] = useState<ResultadoBusqueda[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [recientes, setRecientes] = useState<ResultadoBusqueda[]>([]);
  const [elegido, setElegido] = useState("");
  const pedido = useRef(0);
  const [lista, animarLista] = useAnimate<HTMLDivElement>();

  useEffect(() => {
    if (abierta) setRecientes(leerRecientes());
    else setTexto("");
  }, [abierta]);

  // Búsqueda en el servidor con 220 ms de espera; la última respuesta gana.
  const q = texto.trim();
  useEffect(() => {
    const n = ++pedido.current;
    if (q.length < 2) {
      setResultados([]);
      setBuscando(false);
      return;
    }
    setBuscando(true);
    const t = window.setTimeout(async () => {
      const r = await buscar(q).catch(() => null);
      if (n !== pedido.current) return;
      setBuscando(false);
      setResultados(r?.ok ? r.data : []);
    }, 220);
    return () => window.clearTimeout(t);
  }, [q, buscar]);

  const ir = (href: string, reciente?: ResultadoBusqueda) => {
    if (reciente) {
      const lista = [reciente, ...leerRecientes().filter((x) => x.href !== reciente.href)].slice(0, MAX_RECIENTES);
      try {
        localStorage.setItem(CLAVE_RECIENTES, JSON.stringify(lista));
      } catch {
        // Sin recientes.
      }
    }
    onAbiertaChange(false);
    router.push(href);
  };

  const coincide = (s: string) => !q || normal(s).includes(normal(q));

  const acciones = [
    puede("experiencias.editar") && { id: "nueva-exp", label: "Nueva experiencia", icono: Plus, href: "/backend/collection/experiencias?nueva=1" },
    puede("medios.editar") && { id: "subir", label: "Subir fotos", icono: Upload, href: "/backend/collection/biblioteca?subir=1" },
    puede("experiencias.editar") && { id: "nuevo-destino", label: "Nuevo destino", icono: Plus, href: "/backend/collection/destinos?nuevo=1" },
    { id: "ajustes", label: "Ir a Ajustes", icono: Settings2, href: "/backend/collection/ajustes" },
  ].filter((a): a is { id: string; label: string; icono: LucideIcon; href: string } => !!a && coincide(a.label));

  const modulos = GRUPOS_NAV.map((g) => ({
    titulo: g.titulo ?? "General",
    modulos: g.modulos.filter((m) => (!m.soloSuperAdmin || superAdmin) && coincide(m.label)),
  })).filter((g) => g.modulos.length);

  // Las páginas son cinco y fijas: se buscan acá, sin ir al servidor.
  const todos = useMemo(() => {
    const paginas: ResultadoBusqueda[] = q.length < 2
      ? []
      : PAGINAS.filter((p) => normal(p.titulo).includes(normal(q))).map((p) => ({
          id: p.slug,
          grupo: "paginas" as const,
          titulo: p.titulo,
          detalle: `Página · ${p.ruta}`,
          href: `/backend/collection/paginas/${p.slug}`,
          miniatura: null,
        }));
    return [...resultados, ...paginas];
  }, [resultados, q]);

  // Cuando cambian los resultados, la lista entra con un fundido corto (150).
  useEffect(() => {
    if (lista.current) void animarLista(lista.current, { opacity: [0, 1] }, { duration: DUR.quick, ease: "easeOut" });
  }, [todos, lista, animarLista]);

  const verVolver = coincide("Volver a Traveloz");
  const nada = !!q && !buscando && !todos.length && !acciones.length && !modulos.length && !verVolver;

  return (
    <Command.Dialog
      open={abierta}
      onOpenChange={onAbiertaChange}
      container={raiz ?? undefined}
      label="Buscar en Collection"
      shouldFilter={false}
      loop
      value={elegido}
      onValueChange={setElegido}
      overlayClassName="col-velo fixed inset-0 z-[60] bg-col-ink/30 backdrop-blur-[2px]"
      contentClassName="col-modal fixed left-1/2 top-[12vh] z-[60] flex max-h-[76vh] w-[min(620px,calc(100vw-2rem))] -translate-x-1/2 flex-col overflow-hidden rounded-col-lg bg-col-surface shadow-col-3 focus:outline-none [&_[cmdk-root]]:flex [&_[cmdk-root]]:min-h-0 [&_[cmdk-root]]:flex-1 [&_[cmdk-root]]:flex-col"
    >
      <div className="flex items-center gap-3 border-b border-col-line px-5">
        <Search className="h-4 w-4 shrink-0 text-col-slate" strokeWidth={1.5} aria-hidden />
        <Command.Input
          value={texto}
          onValueChange={setTexto}
          placeholder="Buscá una experiencia, un destino, un artículo…"
          className="h-14 min-w-0 flex-1 border-0 bg-transparent px-0 text-col-lg text-col-ink placeholder:text-col-muted focus:outline-none focus:ring-0"
        />
        {buscando && <LoaderCircle className="h-4 w-4 shrink-0 animate-spin text-col-slate" strokeWidth={1.75} aria-label="Buscando" />}
      </div>
      <ElegidoCtx.Provider value={elegido}>
      {/* layoutScroll: el resaltado se mide bien aunque la lista tenga scroll. */}
      <motion.div ref={lista} layoutScroll className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <Command.List className="p-2">
        {nada && (
          <div className="px-4 py-10 text-center">
            <p className="font-col-display text-col-xl text-col-ink">Nada con «{q}»</p>
            <p className="mt-1 text-col-sm text-col-muted">Probá con otra palabra, o con el nombre del país o la ciudad.</p>
          </div>
        )}

        {!q && recientes.length > 0 && (
          <Command.Group heading="Recientes" className={grupo}>
            {recientes.map((r) => (
              <FilaResultado key={`rec-${r.href}`} r={r} onSelect={() => ir(r.href, r)} reciente />
            ))}
          </Command.Group>
        )}

        {GRUPOS.map((g) => {
          const filas = todos.filter((r) => r.grupo === g.id);
          if (!filas.length) return null;
          return (
            <Command.Group key={g.id} heading={g.titulo} className={grupo}>
              {filas.map((r) => (
                <FilaResultado key={`${r.grupo}-${r.id}`} r={r} onSelect={() => ir(r.href, r)} />
              ))}
            </Command.Group>
          );
        })}

        {acciones.length > 0 && (
          <Command.Group heading="Acciones" className={grupo}>
            {acciones.map((a) => (
              <Command.Item key={a.id} value={`accion-${a.id}`} onSelect={() => ir(a.href)} className={item}>
                <Resaltado valor={`accion-${a.id}`} />
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-col-sm bg-col-base text-col-ink">
                  <a.icono className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                </span>
                <span className="flex-1">{a.label}</span>
              </Command.Item>
            ))}
          </Command.Group>
        )}

        {modulos.map((g) => (
          <Command.Group key={g.titulo} heading={q ? "Ir a" : g.titulo} className={grupo}>
            {g.modulos.map((m) => {
              const Icono = m.icono;
              return (
                <Command.Item key={m.id} value={`modulo-${m.id}`} disabled={!m.href} onSelect={() => m.href && ir(m.href)} className={item}>
                  <Resaltado valor={`modulo-${m.id}`} />
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center">
                    <Icono className="h-[18px] w-[18px]" strokeWidth={1.5} aria-hidden />
                  </span>
                  <span className="flex-1">{m.label}</span>
                  {!m.href && <span className="text-col-xs">Pronto</span>}
                </Command.Item>
              );
            })}
          </Command.Group>
        ))}

        {verVolver && (
          <Command.Group heading="Traveloz" className={grupo}>
            <Command.Item value="volver-traveloz" onSelect={() => ir("/backend/dashboard")} className={item}>
              <Resaltado valor="volver-traveloz" />
              <span className="flex h-9 w-9 shrink-0 items-center justify-center">
                <ArrowLeft className="h-[18px] w-[18px]" strokeWidth={1.5} aria-hidden />
              </span>
              Volver a Traveloz
            </Command.Item>
          </Command.Group>
        )}
      </Command.List>
      </motion.div>
      </ElegidoCtx.Provider>
      <div className="hidden items-center gap-4 border-t border-col-line px-5 py-2.5 text-col-xs text-col-muted sm:flex">
        <span className="flex items-center gap-1.5">
          <kbd className="rounded-col-sm border border-col-line px-1.5 font-col-text">↑ ↓</kbd> moverte
        </span>
        <span className="flex items-center gap-1.5">
          <kbd className="flex items-center rounded-col-sm border border-col-line px-1.5 py-0.5">
            <CornerDownLeft className="h-3 w-3" strokeWidth={1.75} aria-label="Enter" />
          </kbd>
          abrir
        </span>
        <span className="flex items-center gap-1.5">
          <kbd className="rounded-col-sm border border-col-line px-1.5 font-col-text">Esc</kbd> cerrar
        </span>
      </div>
    </Command.Dialog>
  );
}

function FilaResultado({ r, onSelect, reciente }: { r: ResultadoBusqueda; onSelect: () => void; reciente?: boolean }) {
  const Icono = ICONO_GRUPO[r.grupo] ?? Compass;
  const valor = `${reciente ? "rec" : r.grupo}-${r.id}`;
  return (
    <Command.Item value={valor} onSelect={onSelect} className={item}>
      <Resaltado valor={valor} />
      <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-col-sm bg-col-base text-col-slate">
        {r.miniatura ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={r.miniatura} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <Icono className="h-4 w-4" strokeWidth={1.5} aria-hidden />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-col-cuerpo text-col-ink">{r.titulo}</span>
        <span className="block truncate text-col-xs text-col-muted">
          {reciente ? `${GRUPOS.find((g) => g.id === r.grupo)?.titulo ?? ""} · ${r.detalle}` : r.detalle}
        </span>
      </span>
      {reciente && <Clock className="h-3.5 w-3.5 shrink-0 text-col-subtle" strokeWidth={1.5} aria-hidden />}
    </Command.Item>
  );
}
