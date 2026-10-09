"use client";

// Paso 4: recorrido. Tramos como tarjetas ordenables que se abren en el
// lugar: ciudad del catálogo, noches, relato, foto y hotel (del catálogo o
// escrito a mano) con el texto propio de Collection.

import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BedDouble, ChevronDown, LoaderCircle, MapPin, Plus, Search, Star, Trash2, X } from "lucide-react";
import { nochesTotales, textoPlano, type HotelTramo, type Tramo } from "@/lib/collection/experiencia/contenido";
import type { HotelBusqueda } from "@/actions/collection/experiencias.actions";
import { cn } from "@/components/lib/cn";
import { EditorTexto } from "../../editor/EditorTexto";
import { FotoCatalogoImagen, MedioFantasma, MedioImagen } from "../../sitio/medios";
import { Asa, Campo, ChipsTexto, ListaOrdenable, SlotMedio, Stepper, TiraMedios, etiquetaCampo, inputLinea } from "../campos";
import { useConstructor } from "../contexto";
import { nuevoId } from "../estado";

const EASE = [0.22, 1, 0.36, 1] as const;
const MAX_TRAMOS = 12;
const plural = (n: number, a: string, b: string) => `${n} ${n === 1 ? a : b}`;

export function PasoRecorrido() {
  const { borrador, setContenido, editable } = useConstructor();
  const tramos = borrador.contenido.tramos;
  const [abierto, setAbierto] = useState<string | null>(tramos.length === 1 ? tramos[0].id : null);
  const noches = nochesTotales(borrador.contenido);

  const agregar = () => {
    const t: Tramo = { id: nuevoId(), ciudadId: null, ciudadNombre: "", paisNombre: "", noches: 2, relato: "", medio: null, hotel: null };
    setContenido((k) => ({ tramos: [...k.tramos, t] }));
    setAbierto(t.id);
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-6 rounded-sm bg-col-ink px-6 py-4 text-col-base">
        <div>
          <p className="font-col-display text-[36px] leading-none tabular-nums lining-nums">{noches}</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-col-base/60">{noches === 1 ? "Noche" : "Noches"}</p>
        </div>
        <span aria-hidden className="h-10 w-px bg-col-base/15" />
        <div>
          <p className="font-col-display text-[36px] leading-none tabular-nums lining-nums">{tramos.length}</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-col-base/60">{tramos.length === 1 ? "Parada" : "Paradas"}</p>
        </div>
        <p className="ml-auto hidden min-w-0 truncate text-[14px] text-col-base/70 sm:block">
          {tramos.map((t) => t.ciudadNombre).filter(Boolean).join("  ›  ") || "Sumá la primera parada"}
        </p>
      </div>

      <ListaOrdenable
        items={tramos}
        deshabilitado={!editable}
        onOrden={(t) => setContenido(() => ({ tramos: t }))}
        className="flex flex-col gap-3"
        render={(t, i, asa) => (
          <TarjetaTramo
            tramo={t}
            n={i + 1}
            abierto={abierto === t.id || !editable}
            onAlternar={() => setAbierto((a) => (a === t.id ? null : t.id))}
            asa={editable ? <Asa asa={asa} label={`parada ${i + 1}`} /> : null}
            arrastrando={asa.arrastrando}
          />
        )}
      />

      {editable && tramos.length < MAX_TRAMOS && (
        <button
          type="button"
          onClick={agregar}
          className="flex h-14 items-center justify-center gap-2 rounded-sm border border-dashed border-col-slate/30 text-[12px] uppercase tracking-[0.12em] text-col-slate transition-colors hover:border-col-gold hover:text-col-ink"
        >
          <Plus className="h-4 w-4" strokeWidth={1.5} /> Sumar parada
        </button>
      )}
    </div>
  );
}

function TarjetaTramo({
  tramo: t,
  n,
  abierto,
  onAlternar,
  asa,
  arrastrando,
}: {
  tramo: Tramo;
  n: number;
  abierto: boolean;
  onAlternar: () => void;
  asa: React.ReactNode;
  arrastrando: boolean;
}) {
  const { setContenido, mapas, editable } = useConstructor();
  const cambiar = (c: Partial<Tramo>) =>
    setContenido((k) => ({ tramos: k.tramos.map((x) => (x.id === t.id ? { ...x, ...c } : x)) }));
  const thumb = t.medio ? mapas.medios.get(t.medio.medioId) : undefined;
  const fotoHotel = t.hotel?.alojamientoId ? mapas.fotosHotel.get(t.hotel.alojamientoId)?.[0] : undefined;
  const falta = !t.ciudadNombre.trim() || t.noches === 0 || textoPlano(t.relato).length < 80;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-sm border bg-col-surface transition-[border-color,box-shadow] duration-200 ease-col",
        abierto ? "border-col-slate/30" : "border-col-line",
        arrastrando && "shadow-[0_24px_48px_-24px_rgba(50,55,59,0.5)]",
      )}
    >
      <div className="flex items-center gap-3 p-2.5 pl-1">
        {asa ?? <span className="w-2" />}
        <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-sm">
          {thumb ? (
            <MedioImagen medio={thumb} relleno sizes="60px" />
          ) : fotoHotel ? (
            <FotoCatalogoImagen foto={fotoHotel} relleno />
          ) : (
            <MedioFantasma relleno />
          )}
        </div>
        <button
          type="button"
          onClick={onAlternar}
          aria-expanded={abierto}
          className="flex min-w-0 flex-1 items-center gap-3 self-stretch text-left"
        >
          <span className="min-w-0 flex-1">
            <span className="flex items-baseline gap-2">
              <span className="font-col-display text-[15px] text-col-gold">{String(n).padStart(2, "0")}</span>
              <span className={cn("truncate font-col-display text-[24px] leading-tight", t.ciudadNombre ? "text-col-ink" : "italic text-col-slate/50")}>
                {t.ciudadNombre || "Ciudad sin elegir"}
              </span>
            </span>
            <span className="mt-0.5 flex items-center gap-2 truncate text-[12px] text-col-slate">
              {t.paisNombre && <span>{t.paisNombre}</span>}
              {t.hotel?.nombre && (
                <span className="flex items-center gap-1 truncate">
                  <BedDouble className="h-3 w-3" strokeWidth={1.5} aria-hidden /> {t.hotel.nombre}
                </span>
              )}
              {falta && <span className="text-[#B07A2A]">Falta completar</span>}
            </span>
          </span>
        </button>
        <Stepper
          valor={t.noches}
          onCambio={(noches) => cambiar({ noches })}
          label={`Noches en ${t.ciudadNombre || `la parada ${n}`}`}
          deshabilitado={!editable}
        />
        {editable && (
          <button
            type="button"
            onClick={onAlternar}
            aria-label={abierto ? "Cerrar parada" : "Abrir parada"}
            className="flex h-9 w-9 items-center justify-center rounded-sm text-col-slate hover:bg-col-base hover:text-col-ink"
          >
            <ChevronDown className={cn("h-4 w-4 transition-transform duration-300 ease-col", abierto && "rotate-180")} strokeWidth={1.5} />
          </button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {abierto && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-8 border-t border-col-line px-5 pb-6 pt-6">
              <div className="grid grid-cols-[1fr_140px] gap-6">
                <BuscadorCiudad tramo={t} onCambio={cambiar} />
                <Campo etiqueta="Foto de la parada">
                  <SlotMedio
                    aspecto={4 / 5}
                    medioId={t.medio?.medioId}
                    etiqueta={`foto de ${t.ciudadNombre || "la parada"}`}
                    vacio="Elegir"
                    tipo="FOTO"
                    onCambio={(m) => cambiar({ medio: m ? { medioId: m.id } : null })}
                  />
                </Campo>
              </div>
              <Campo etiqueta="Relato" ayuda="Qué se vive en esta parada. Al menos 80 caracteres.">
                <EditorTexto
                  etiqueta={`Relato de ${t.ciudadNombre || "la parada"}`}
                  valor={t.relato}
                  onCambio={(relato) => cambiar({ relato })}
                  placeholder="La capital se disfruta en capas…"
                  minAlto={140}
                  recomendado={80}
                  deshabilitado={!editable}
                />
              </Campo>
              <Hotel tramo={t} onCambio={(hotel) => cambiar({ hotel })} />
              {editable && (
                <button
                  type="button"
                  onClick={() => setContenido((k) => ({ tramos: k.tramos.filter((x) => x.id !== t.id) }))}
                  className="flex items-center gap-2 self-start text-[12px] uppercase tracking-[0.12em] text-col-slate transition-colors hover:text-col-alerta"
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} /> Quitar parada
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Buscadores ────────────────────────────────────────────────────────────

/** Combobox con búsqueda asíncrona (lista debajo, flechas y Enter). */
function useBusqueda<T>(buscar: (q: string) => Promise<T[]>, deps: unknown[]) {
  const [q, setQ] = useState("");
  const [abierta, setAbierta] = useState(false);
  const [items, setItems] = useState<T[]>([]);
  const [cargando, setCargando] = useState(false);
  const [activo, setActivo] = useState(0);
  const n = useRef(0);
  useEffect(() => {
    if (!abierta) return;
    const id = ++n.current;
    setCargando(true);
    const t = window.setTimeout(async () => {
      const r = await buscar(q).catch(() => [] as T[]);
      if (id !== n.current) return;
      setItems(r);
      setActivo(0);
      setCargando(false);
    }, 250);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, abierta, ...deps]);
  return { q, setQ, abierta, setAbierta, items, cargando, activo, setActivo };
}

function BuscadorCiudad({ tramo: t, onCambio }: { tramo: Tramo; onCambio: (c: Partial<Tramo>) => void }) {
  const { api } = useConstructor();
  const lista = useId();
  const b = useBusqueda(async (q) => {
    const r = await api.buscarCiudades(q);
    return r.ok ? r.data : [];
  }, []);
  const elegir = (c: { id: string; nombre: string; paisNombre: string }) => {
    onCambio({ ciudadId: c.id, ciudadNombre: c.nombre, paisNombre: c.paisNombre });
    b.setAbierta(false);
    b.setQ("");
  };
  const usarTexto = () => {
    onCambio({ ciudadId: null, ciudadNombre: b.q.trim().slice(0, 120) });
    b.setAbierta(false);
    b.setQ("");
  };

  return (
    <Campo etiqueta="Ciudad" htmlFor={`${lista}-in`} ayuda={t.ciudadId ? "Del catálogo de Traveloz." : t.ciudadNombre ? "Escrita a mano." : undefined}>
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-col-gold" strokeWidth={1.5} />
        <input
          id={`${lista}-in`}
          role="combobox"
          aria-expanded={b.abierta}
          aria-controls={lista}
          aria-autocomplete="list"
          value={b.abierta ? b.q : t.ciudadNombre ? `${t.ciudadNombre}${t.paisNombre ? `, ${t.paisNombre}` : ""}` : ""}
          onFocus={() => {
            b.setQ("");
            b.setAbierta(true);
          }}
          onBlur={() => window.setTimeout(() => b.setAbierta(false), 150)}
          onChange={(e) => b.setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") b.setActivo((a) => Math.min(b.items.length - 1, a + 1));
            else if (e.key === "ArrowUp") b.setActivo((a) => Math.max(0, a - 1));
            else if (e.key === "Enter") {
              e.preventDefault();
              if (b.items[b.activo]) elegir(b.items[b.activo]);
              else if (b.q.trim()) usarTexto();
            } else if (e.key === "Escape") b.setAbierta(false);
            else return;
            if (e.key.startsWith("Arrow")) e.preventDefault();
          }}
          placeholder="Buscá una ciudad"
          className={cn(inputLinea, "pl-6 text-[17px]")}
        />
        {b.abierta && (
          <ul
            id={lista}
            role="listbox"
            className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-sm border border-col-line bg-col-surface py-1 shadow-[0_20px_40px_-20px_rgba(50,55,59,0.45)]"
          >
            {b.cargando && b.items.length === 0 && (
              <li className="flex items-center gap-2 px-4 py-3 text-[13px] text-col-slate">
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> Buscando
              </li>
            )}
            {b.items.map((c, i) => (
              <li
                key={c.id}
                role="option"
                aria-selected={i === b.activo}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => b.setActivo(i)}
                onClick={() => elegir(c)}
                className={cn("flex cursor-pointer items-baseline gap-2 px-4 py-2.5 text-[15px]", i === b.activo && "bg-col-base")}
              >
                <span className="text-col-ink">{c.nombre}</span>
                <span className="text-[12px] text-col-slate">{c.paisNombre}</span>
              </li>
            ))}
            {!b.cargando && b.items.length === 0 && !b.q.trim() && (
              <li className="px-4 py-3 text-[13px] text-col-slate">Escribí para buscar en el catálogo.</li>
            )}
            {b.q.trim() && (
              <li
                role="option"
                aria-selected={false}
                onMouseDown={(e) => e.preventDefault()}
                onClick={usarTexto}
                className="cursor-pointer border-t border-col-line px-4 py-2.5 text-[13px] text-col-slate hover:bg-col-base hover:text-col-ink"
              >
                Usar «{b.q.trim()}» como está
              </li>
            )}
          </ul>
        )}
      </div>
    </Campo>
  );
}

function Hotel({ tramo: t, onCambio }: { tramo: Tramo; onCambio: (h: HotelTramo | null) => void }) {
  const { api, mapas, agregarFotosHotel, editable } = useConstructor();
  const lista = useId();
  const h = t.hotel;
  const b = useBusqueda<HotelBusqueda>(async (q) => {
    const r = await api.buscarHoteles({ q: q.trim() || undefined, ciudadId: q.trim() ? undefined : t.ciudadId ?? undefined });
    return r.ok ? r.data : [];
  }, [t.ciudadId]);

  const base: HotelTramo = h ?? { alojamientoId: null, nombre: "", texto: "", destacados: [], medios: [] };
  const elegir = (x: HotelBusqueda) => {
    agregarFotosHotel(x.id, x.fotos);
    onCambio({ ...base, alojamientoId: x.id, nombre: x.nombre });
    b.setAbierta(false);
  };
  const usarNombre = () => {
    onCambio({ ...base, alojamientoId: null, nombre: b.q.trim().slice(0, 160) });
    b.setAbierta(false);
  };
  const cambiar = (c: Partial<HotelTramo>) => onCambio({ ...base, ...c });
  const fotosCatalogo = h?.alojamientoId ? mapas.fotosHotel.get(h.alojamientoId) ?? [] : [];

  return (
    <div className="flex flex-col gap-6 rounded-sm bg-col-base/70 p-5">
      <div className="flex items-center gap-3">
        <BedDouble className="h-5 w-5 text-col-gold" strokeWidth={1.4} aria-hidden />
        <p className="font-col-display text-[22px] leading-none text-col-ink">Hotel</p>
        {h?.nombre && (
          <span className="rounded-sm border border-col-line bg-col-surface px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-col-slate">
            {h.alojamientoId ? "Del catálogo" : "Nombre escrito"}
          </span>
        )}
        {h && editable && (
          <button
            type="button"
            onClick={() => onCambio(null)}
            className="ml-auto flex items-center gap-1 text-[11px] uppercase tracking-[0.12em] text-col-slate hover:text-col-alerta"
          >
            <X className="h-3.5 w-3.5" strokeWidth={1.5} /> Quitar hotel
          </button>
        )}
      </div>

      <div className="relative">
        <label htmlFor={`${lista}-in`} className={etiquetaCampo}>
          {h?.nombre ? "Cambiar hotel" : "Buscar en el catálogo"}
        </label>
        <div className="relative mt-2">
          <Search className="pointer-events-none absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-col-slate" strokeWidth={1.5} />
          <input
            id={`${lista}-in`}
            role="combobox"
            aria-expanded={b.abierta}
            aria-controls={lista}
            value={b.abierta ? b.q : h?.nombre ?? ""}
            onFocus={() => {
              b.setQ("");
              b.setAbierta(true);
            }}
            onBlur={() => window.setTimeout(() => b.setAbierta(false), 150)}
            onChange={(e) => b.setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") b.setActivo((a) => Math.min(b.items.length - 1, a + 1));
              else if (e.key === "ArrowUp") b.setActivo((a) => Math.max(0, a - 1));
              else if (e.key === "Enter") {
                e.preventDefault();
                if (b.items[b.activo]) elegir(b.items[b.activo]);
                else if (b.q.trim()) usarNombre();
              } else if (e.key === "Escape") b.setAbierta(false);
              else return;
              if (e.key.startsWith("Arrow")) e.preventDefault();
            }}
            placeholder={t.ciudadId ? `Hoteles en ${t.ciudadNombre}` : "Nombre del hotel"}
            className={cn(inputLinea, "pl-6 font-col-display text-[20px]")}
          />
          {b.abierta && (
            <ul
              id={lista}
              role="listbox"
              className="absolute inset-x-0 top-full z-20 mt-1 max-h-80 overflow-y-auto rounded-sm border border-col-line bg-col-surface py-1 shadow-[0_20px_40px_-20px_rgba(50,55,59,0.45)]"
            >
              {b.cargando && b.items.length === 0 && (
                <li className="flex items-center gap-2 px-4 py-3 text-[13px] text-col-slate">
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> Buscando
                </li>
              )}
              {b.items.map((x, i) => (
                <li
                  key={x.id}
                  role="option"
                  aria-selected={i === b.activo}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => b.setActivo(i)}
                  onClick={() => elegir(x)}
                  className={cn("flex cursor-pointer items-center gap-3 px-3 py-2", i === b.activo && "bg-col-base")}
                >
                  <span className="relative h-10 w-14 shrink-0 overflow-hidden rounded-sm bg-col-line">
                    {x.fotos[0] && <FotoCatalogoImagen foto={x.fotos[0]} relleno />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] text-col-ink">{x.nombre}</span>
                    <span className="flex items-center gap-2 text-[12px] text-col-slate">
                      {x.ciudadNombre}
                      {x.categoria ? (
                        <span className="flex items-center gap-0.5 text-col-gold" aria-label={`${x.categoria} estrellas`}>
                          {Array.from({ length: x.categoria }, (_, j) => (
                            <Star key={j} className="h-2.5 w-2.5 fill-current" strokeWidth={0} />
                          ))}
                        </span>
                      ) : null}
                    </span>
                  </span>
                </li>
              ))}
              {!b.cargando && b.items.length === 0 && (
                <li className="px-4 py-3 text-[13px] text-col-slate">
                  {b.q.trim() ? "No está en el catálogo." : "Escribí el nombre para buscar."}
                </li>
              )}
              {b.q.trim() && (
                <li
                  role="option"
                  aria-selected={false}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={usarNombre}
                  className="cursor-pointer border-t border-col-line px-4 py-2.5 text-[13px] text-col-slate hover:bg-col-base hover:text-col-ink"
                >
                  Usar el nombre escrito: «{b.q.trim()}»
                </li>
              )}
            </ul>
          )}
        </div>
      </div>

      {h && (
        <>
          <Campo etiqueta="Por qué lo elegimos" ayuda="Texto propio de Collection. No cambia la ficha del hotel en Traveloz.">
            <EditorTexto
              etiqueta={`Por qué elegimos ${h.nombre || "el hotel"}`}
              valor={h.texto}
              onCambio={(texto) => cambiar({ texto })}
              placeholder="Lo elegimos por la calma…"
              minAlto={110}
              compacto
              deshabilitado={!editable}
            />
          </Campo>
          <Campo etiqueta="Destacados" ayuda="Enter para sumar. Hasta 8.">
            <ChipsTexto
              label="Nuevo destacado"
              valores={h.destacados}
              onCambio={(destacados) => cambiar({ destacados })}
              placeholder="Suite con vista al mar"
              max={8}
              deshabilitado={!editable}
            />
          </Campo>
          <Campo
            etiqueta="Fotos propias"
            ayuda={
              h.medios.length === 0 && fotosCatalogo.length > 0
                ? "Sin fotos propias, la página usa estas del catálogo."
                : undefined
            }
          >
            <TiraMedios
              refs={h.medios}
              onCambio={(medios) => cambiar({ medios })}
              max={12}
              etiqueta={`Fotos de ${h.nombre || "el hotel"}`}
            />
            {h.medios.length === 0 && fotosCatalogo.length > 0 && (
              <div className="grid grid-cols-4 gap-2 opacity-80">
                {fotosCatalogo.slice(0, 4).map((f) => (
                  <FotoCatalogoImagen key={f.url} foto={f} aspecto={1} className="rounded-sm" />
                ))}
              </div>
            )}
          </Campo>
        </>
      )}
      {!h && <p className="-mt-2 text-[13px] text-col-slate">{plural(t.noches, "noche", "noches")} sin hotel elegido.</p>}
    </div>
  );
}
