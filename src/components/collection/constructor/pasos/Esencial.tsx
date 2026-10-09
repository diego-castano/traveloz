"use client";

// Paso 1: lo esencial. Título, bajada, tipo, destinos, especialista,
// dirección web, destacada y proveedor interno.

import { useState } from "react";
import { BedDouble, Check, ChevronDown, Compass, LoaderCircle, Plus, Ship, TrainTrack, UserRound } from "lucide-react";
import { TIPOS_EXPERIENCIA, type TipoExperiencia } from "@/lib/collection/experiencia/contenido";
import { cn } from "@/components/lib/cn";
import { Interruptor } from "../../ui";
import { MedioImagen } from "../../sitio/medios";
import { Campo, Contador, Grupo, inputLinea } from "../campos";
import { useConstructor } from "../contexto";
import { slugDe } from "../estado";

const TIPOS: Record<TipoExperiencia, { label: string; texto: string; icono: typeof Compass }> = {
  VIAJE: { label: "Viaje", texto: "Varias paradas", icono: Compass },
  HOTEL: { label: "Hotel", texto: "Una estadía", icono: BedDouble },
  CRUCERO: { label: "Crucero", texto: "Por mar o río", icono: Ship },
  TREN: { label: "Tren", texto: "Sobre rieles", icono: TrainTrack },
};

const MAX_DESTINOS = 6;

export function PasoEsencial() {
  const { borrador, setCampos, proveedores, editable } = useConstructor();
  const c = borrador.campos;

  const cambiarTitulo = (titulo: string) => {
    const automatico = c.slug === "" || c.slug === slugDe(c.titulo);
    setCampos(automatico ? { titulo, slug: slugDe(titulo) } : { titulo });
  };

  return (
    <div className="flex flex-col gap-12">
      <div className="flex flex-col gap-8">
        <Campo etiqueta="Título" htmlFor="exp-titulo" accion={<Contador n={c.titulo.length} ideal={60} max={140} />}>
          <input
            id="exp-titulo"
            value={c.titulo}
            maxLength={140}
            onChange={(e) => cambiarTitulo(e.target.value)}
            placeholder="Filipinas: Manila, El Nido y Boracay"
            className={cn(inputLinea, "py-3 font-col-display text-[28px] leading-tight placeholder:italic md:text-[34px]")}
          />
        </Campo>
        <Campo
          etiqueta="Bajada"
          htmlFor="exp-bajada"
          ayuda="Una línea debajo del título. Qué se siente, no qué incluye."
          accion={<Contador n={c.bajada.length} ideal={120} max={240} />}
        >
          <textarea
            id="exp-bajada"
            rows={1}
            value={c.bajada}
            maxLength={240}
            onChange={(e) => setCampos({ bajada: e.target.value })}
            placeholder="Tres islas, dos mares y una idea distinta de la calma."
            className={cn(inputLinea, "resize-none text-[17px] leading-relaxed [field-sizing:content]")}
          />
        </Campo>
      </div>

      <Grupo titulo="Tipo de experiencia">
        <div role="radiogroup" aria-label="Tipo de experiencia" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {TIPOS_EXPERIENCIA.map((t) => {
            const { label, texto, icono: Icono } = TIPOS[t];
            const activo = c.tipo === t;
            return (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={activo}
                onClick={() => setCampos({ tipo: t })}
                className={cn(
                  "group relative flex flex-col items-start gap-6 rounded-sm border p-4 text-left transition-[border-color,background-color,transform] duration-200 ease-col active:scale-[0.98]",
                  activo ? "border-col-ink bg-col-ink text-col-base" : "border-col-line bg-col-surface text-col-ink hover:border-col-slate/50",
                )}
              >
                <Icono className={cn("h-6 w-6", activo ? "text-col-gold" : "text-col-slate")} strokeWidth={1.25} aria-hidden />
                <span>
                  <span className="block font-col-display text-[22px] leading-none">{label}</span>
                  <span className={cn("mt-1 block text-[12px]", activo ? "text-col-base/60" : "text-col-slate")}>{texto}</span>
                </span>
              </button>
            );
          })}
        </div>
      </Grupo>

      <Destinos />
      <Especialistas />

      <Grupo titulo="En el sitio">
        <Campo
          etiqueta="Dirección web"
          htmlFor="exp-slug"
          ayuda={
            <>
              collection.traveloz.com.uy/experiencias/
              <span className="text-col-ink">{c.slug || "…"}</span>
            </>
          }
          accion={
            editable &&
            c.slug !== slugDe(c.titulo) &&
            c.titulo && (
              <button
                type="button"
                onClick={() => setCampos({ slug: slugDe(c.titulo) })}
                className="text-[12px] uppercase tracking-[0.12em] text-col-slate underline decoration-col-gold underline-offset-4 hover:text-col-ink"
              >
                Usar el título
              </button>
            )
          }
        >
          <input
            id="exp-slug"
            value={c.slug}
            maxLength={80}
            spellCheck={false}
            onChange={(e) =>
              setCampos({
                slug: e.target.value
                  .toLowerCase()
                  .replace(/\s+/g, "-")
                  .replace(/[^a-z0-9-]/g, "")
                  .replace(/-{2,}/g, "-"),
              })
            }
            onBlur={() => setCampos({ slug: slugDe(c.slug) })}
            placeholder="filipinas-manila-el-nido-boracay"
            className={cn(inputLinea, "font-mono text-[14px]")}
          />
        </Campo>
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-[15px] text-col-ink">Destacada</p>
            <p className="mt-0.5 text-[13px] text-col-slate">Aparece primero en la portada del sitio.</p>
          </div>
          <Interruptor
            checked={c.destacada}
            onCheckedChange={(v) => setCampos({ destacada: v })}
            disabled={!editable}
            label="Destacada"
          />
        </div>
        <Campo etiqueta="Proveedor interno" htmlFor="exp-proveedor" ayuda="Nunca se muestra en el sitio.">
          <div className="relative">
            <select
              id="exp-proveedor"
              value={c.proveedorId ?? ""}
              onChange={(e) => setCampos({ proveedorId: e.target.value || null })}
              className={cn(inputLinea, "appearance-none pr-8")}
            >
              <option value="">Sin proveedor</option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
              {c.proveedorId && !proveedores.some((p) => p.id === c.proveedorId) && (
                <option value={c.proveedorId}>Proveedor dado de baja</option>
              )}
            </select>
            <ChevronDown className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-col-slate" strokeWidth={1.5} />
          </div>
        </Campo>
      </Grupo>
    </div>
  );
}

function Destinos() {
  const { borrador, setCampos, mapas, agregarDestino, api, editable } = useConstructor();
  const ids = borrador.campos.destinoIds;
  const [nombre, setNombre] = useState("");
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [abierto, setAbierto] = useState(false);

  const alternar = (id: string) =>
    setCampos({ destinoIds: ids.includes(id) ? ids.filter((x) => x !== id) : ids.length < MAX_DESTINOS ? [...ids, id] : ids });

  const crear = async () => {
    const n = nombre.trim();
    if (!n) return;
    setCreando(true);
    setError(null);
    const r = await api.crearDestino({ nombre: n }).catch(() => null);
    setCreando(false);
    if (!r?.ok) {
      setError(r?.error ?? "Sin conexión. Probá de nuevo.");
      return;
    }
    agregarDestino({ id: r.data.id, nombre: n, slug: r.data.slug, estado: "BORRADOR" });
    if (ids.length < MAX_DESTINOS) setCampos({ destinoIds: [...ids, r.data.id] });
    setNombre("");
    setAbierto(false);
  };

  const opciones = mapas.destinosOpciones.filter((d) => d.estado !== "ARCHIVADO" || ids.includes(d.id));

  return (
    <Grupo titulo="Destinos" ayuda={`Dónde aparece en el sitio. Hasta ${MAX_DESTINOS}.`}>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Destinos">
        {opciones.map((d) => {
          const activo = ids.includes(d.id);
          return (
            <button
              key={d.id}
              type="button"
              aria-pressed={activo}
              onClick={() => alternar(d.id)}
              className={cn(
                "flex h-10 items-center gap-2 rounded-sm border px-4 text-[14px] transition-colors duration-200 ease-col",
                activo
                  ? "border-col-ink bg-col-ink text-col-base"
                  : "border-col-line bg-col-surface text-col-slate hover:border-col-slate/50 hover:text-col-ink",
              )}
            >
              {activo && <Check className="h-3.5 w-3.5 text-col-gold" strokeWidth={2} aria-hidden />}
              {d.nombre}
              {d.estado === "PROXIMAMENTE" && <span className="text-[10px] uppercase tracking-[0.12em] opacity-60">Pronto</span>}
            </button>
          );
        })}
        {editable &&
          (abierto ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void crear();
              }}
              className="flex h-10 items-center gap-2 rounded-sm border border-col-gold bg-col-surface pl-3 pr-1"
            >
              <input
                autoFocus
                value={nombre}
                maxLength={80}
                onChange={(e) => setNombre(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && setAbierto(false)}
                aria-label="Nombre del destino nuevo"
                placeholder="Misterios de Oriente"
                className="w-48 border-0 bg-transparent p-0 text-[14px] focus:outline-none focus:ring-0"
              />
              <button
                type="submit"
                disabled={creando || !nombre.trim()}
                className="flex h-8 items-center gap-1.5 rounded-sm bg-col-ink px-3 text-[11px] uppercase tracking-[0.12em] text-col-base disabled:opacity-40"
              >
                {creando ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : "Crear"}
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setAbierto(true)}
              className="flex h-10 items-center gap-1.5 rounded-sm border border-dashed border-col-slate/40 px-4 text-[13px] text-col-slate transition-colors hover:border-col-gold hover:text-col-ink"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={1.75} /> Crear destino
            </button>
          ))}
      </div>
      {error && (
        <p role="alert" className="-mt-4 text-[13px] text-col-alerta">
          {error}
        </p>
      )}
    </Grupo>
  );
}

function Especialistas() {
  const { borrador, setCampos, mapas, agregarEspecialista, api, editable } = useConstructor();
  const elegido = borrador.campos.especialistaId;
  const lista = Array.from(mapas.especialistas.values());
  const [nombre, setNombre] = useState("");
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const crear = async () => {
    const n = nombre.trim();
    if (!n) return;
    setCreando(true);
    setError(null);
    const r = await api.crearEspecialista({ nombre: n }).catch(() => null);
    setCreando(false);
    if (!r?.ok) {
      setError(r?.error ?? "Sin conexión. Probá de nuevo.");
      return;
    }
    agregarEspecialista({
      id: r.data.id,
      nombre: n,
      region: "",
      frase: "",
      idiomas: [],
      retrato: null,
      whatsapp: "",
      email: "",
      telefono: "",
    });
    setCampos({ especialistaId: r.data.id });
    setNombre("");
  };

  return (
    <Grupo titulo="Especialista a cargo" ayuda="Quien firma la experiencia y atiende las consultas.">
      <div role="radiogroup" aria-label="Especialista" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {lista.map((e) => {
          const activo = e.id === elegido;
          return (
            <button
              key={e.id}
              type="button"
              role="radio"
              aria-checked={activo}
              onClick={() => setCampos({ especialistaId: activo ? null : e.id })}
              className={cn(
                "group flex items-center gap-3 rounded-sm border p-2.5 text-left transition-[border-color,background-color] duration-200 ease-col",
                activo ? "border-col-gold bg-col-surface ring-1 ring-col-gold" : "border-col-line bg-col-surface hover:border-col-slate/50",
              )}
            >
              <span className="relative h-14 w-11 shrink-0 overflow-hidden rounded-sm bg-col-base">
                {e.retrato ? (
                  <MedioImagen medio={e.retrato} relleno sizes="60px" />
                ) : (
                  <UserRound className="absolute inset-0 m-auto h-5 w-5 text-col-slate/40" strokeWidth={1.25} />
                )}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-col-display text-[19px] leading-tight text-col-ink">{e.nombre}</span>
                <span className="block truncate text-[12px] text-col-slate">{e.region || "Sin región"}</span>
              </span>
              {activo && <Check className="ml-auto h-4 w-4 shrink-0 text-col-gold" strokeWidth={2} aria-hidden />}
            </button>
          );
        })}
      </div>
      {editable && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void crear();
          }}
          className="-mt-2 flex items-end gap-3"
        >
          <Campo etiqueta="Sumar especialista" htmlFor="esp-nuevo" className="flex-1" error={error}>
            <input
              id="esp-nuevo"
              value={nombre}
              maxLength={100}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre y apellido"
              className={inputLinea}
            />
          </Campo>
          <button
            type="submit"
            disabled={creando || !nombre.trim()}
            className="mb-1 flex h-9 items-center gap-1.5 rounded-sm border border-col-ink/25 px-4 text-[12px] uppercase tracking-[0.12em] text-col-ink transition-colors hover:border-col-ink disabled:opacity-40"
          >
            {creando ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />}
            Crear
          </button>
        </form>
      )}
    </Grupo>
  );
}
