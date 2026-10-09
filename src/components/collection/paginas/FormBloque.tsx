"use client";

// Formulario del bloque elegido. Los campos salen de una tabla por tipo (el
// contrato está en paginas/contenido.ts); las listas (cifras, estilos,
// elegidos, galería) tienen su pieza propia.

import { Plus, Trash2 } from "lucide-react";
import { textoPlano } from "@/lib/collection/experiencia/contenido";
import type { Bloque, MapasPagina, TipoBloque } from "@/lib/collection/paginas/contenido";
import { cn } from "@/components/lib/cn";
import { EditorTexto } from "../editor/EditorTexto";
import { Asa, Campo, Contador, ListaOrdenable, SlotMedio, TiraMedios, entrada, entradaArea, entradaSelect, entradaTitulo } from "../constructor/campos";
import { Elegidos, Segmentado, type OpcionElegible } from "../constructor/Elegidos";
import { nuevoId } from "../constructor/estado";

type Patch = Record<string, unknown>;
type Valores = Record<string, unknown>;

type Def =
  | { c: "linea" | "area"; k: string; label: string; max: number; grande?: boolean; ayuda?: string; ph?: string }
  | { c: "html"; k: string; label: string; max: number; alto?: number; ph?: string }
  | { c: "medio"; k: string; label: string; aspecto: number; conVideo?: boolean }
  | { c: "seg"; k: string; label: string; opciones: readonly (readonly [string, string])[] }
  | {
      c: "elegidos";
      k: string;
      modoK: string;
      label: string;
      max: number;
      fuente: "destinos" | "experiencias" | "testimonios" | "articulos";
      modos: readonly (readonly [string, string])[];
      elegir: string;
      ayudaAuto: string;
    }
  | { c: "galeria" | "cifras" | "estilos" | "categoria" }
  | { c: "nota"; texto: string };

const eyebrow: Def = { c: "linea", k: "eyebrow", label: "Antetítulo", max: 80, ph: "Ej.: Viajes de autor" };
const titulo: Def = { c: "linea", k: "titulo", label: "Título", max: 160, grande: true };
const bajada: Def = { c: "area", k: "bajada", label: "Bajada", max: 300 };
const cta: Def[] = [
  { c: "linea", k: "ctaTexto", label: "Texto del botón", max: 40, ph: "Ver experiencias" },
  { c: "linea", k: "ctaHref", label: "Enlace del botón", max: 200, ph: "/experiencias", ayuda: "Una ruta del sitio (/contacto) o una dirección completa." },
];

const CAMPOS: Record<TipoBloque, Def[]> = {
  portada: [eyebrow, titulo, bajada, { c: "medio", k: "medio", label: "Foto o video", aspecto: 16 / 9, conVideo: true }, ...cta],
  manifiesto: [eyebrow, { c: "html", k: "texto", label: "Texto", max: 4000, alto: 180 }, { c: "linea", k: "firma", label: "Firma", max: 120 }],
  texto: [
    eyebrow,
    titulo,
    { c: "html", k: "texto", label: "Texto", max: 40000, alto: 360, ph: "Subtítulos, listas, tablas y enlaces." },
    { c: "seg", k: "ancho", label: "Ancho", opciones: [["angosto", "Angosto"], ["ancho", "Ancho"]] },
  ],
  imagenTexto: [
    eyebrow,
    titulo,
    { c: "html", k: "texto", label: "Texto", max: 6000, alto: 200 },
    { c: "medio", k: "medio", label: "Foto", aspecto: 4 / 5 },
    { c: "seg", k: "lado", label: "Foto a la", opciones: [["izquierda", "Izquierda"], ["derecha", "Derecha"]] },
  ],
  galeria: [titulo, { c: "galeria" }],
  cita: [
    { c: "area", k: "texto", label: "Frase", max: 400, grande: true },
    { c: "linea", k: "autor", label: "Autor", max: 120 },
    { c: "medio", k: "medio", label: "Foto de fondo", aspecto: 16 / 9 },
  ],
  cifras: [titulo, { c: "cifras" }],
  destinos: [
    eyebrow,
    titulo,
    bajada,
    {
      c: "elegidos",
      k: "destinoIds",
      modoK: "modo",
      label: "Destinos",
      max: 24,
      fuente: "destinos",
      modos: [["todos", "Todos"], ["elegidos", "Elegidos"]],
      elegir: "elegidos",
      ayudaAuto: "Se muestran todos los destinos publicados, en el orden de Destinos." },
  ],
  experiencias: [
    eyebrow,
    titulo,
    bajada,
    {
      c: "elegidos",
      k: "experienciaIds",
      modoK: "modo",
      label: "Experiencias",
      max: 12,
      fuente: "experiencias",
      modos: [["destacadas", "Destacadas"], ["elegidas", "Elegidas"]],
      elegir: "elegidas",
      ayudaAuto: "Se muestran hasta 6 experiencias destacadas, en el orden de Experiencias." },
  ],
  estilos: [eyebrow, titulo, { c: "estilos" }],
  especialistas: [eyebrow, titulo, bajada, { c: "nota", texto: "Se muestran todos los especialistas, en el orden de Especialistas." }],
  testimonios: [
    eyebrow,
    titulo,
    {
      c: "elegidos",
      k: "testimonioIds",
      modoK: "modo",
      label: "Testimonios",
      max: 12,
      fuente: "testimonios",
      modos: [["todos", "Todos"], ["elegidos", "Elegidos"]],
      elegir: "elegidos",
      ayudaAuto: "Se muestran todos los testimonios publicados." },
  ],
  aliados: [eyebrow, titulo, bajada, { c: "nota", texto: "Se muestran todos los aliados publicados, en el orden de Aliados." }],
  preguntas: [eyebrow, titulo, { c: "categoria" }],
  journal: [
    eyebrow,
    titulo,
    {
      c: "elegidos",
      k: "articuloIds",
      modoK: "modo",
      label: "Artículos",
      max: 6,
      fuente: "articulos",
      modos: [["recientes", "Recientes"], ["elegidos", "Elegidos"]],
      elegir: "elegidos",
      ayudaAuto: "Se muestran los 3 artículos publicados más recientes." },
  ],
  newsletter: [titulo, { c: "area", k: "texto", label: "Texto", max: 300 }, { c: "medio", k: "medio", label: "Foto", aspecto: 16 / 9 }],
  cierre: [eyebrow, titulo, { c: "area", k: "texto", label: "Texto", max: 300 }, ...cta, { c: "medio", k: "medio", label: "Foto", aspecto: 4 / 5 }] };

function opcionesDe(fuente: "destinos" | "experiencias" | "testimonios" | "articulos", m: MapasPagina): OpcionElegible[] {
  switch (fuente) {
    case "destinos":
      return m.destinos.map((d) => ({
        id: d.id,
        titulo: d.nombre,
        detalle: d.proximamente ? "Próximamente" : `${d.experiencias} experiencias`,
        medio: d.portada }));
    case "experiencias":
      return m.experiencias.map((e) => ({ id: e.id, titulo: e.titulo, detalle: e.destinos.join(", "), medio: e.portada }));
    case "testimonios":
      return m.testimonios.map((t) => ({ id: t.id, titulo: t.nombre, detalle: t.viaje || t.cita, medio: t.foto }));
    case "articulos":
      return m.articulos.map((a) => ({ id: a.id, titulo: a.titulo, detalle: `${a.minutos} min de lectura`, medio: a.portada }));
  }
}

export function FormBloque({
  bloque,
  onCambio,
  mapas,
  editable,
  legal }: {
  bloque: Bloque;
  onCambio: (p: Patch) => void;
  mapas: MapasPagina;
  editable: boolean;
  /** Página legal editada directo: sin antetítulo. */
  legal?: boolean;
}) {
  const v = bloque as unknown as Valores;
  const str = (k: string) => String(v[k] ?? "");
  return (
    <div className="flex flex-col gap-8">
      {CAMPOS[bloque.tipo].filter((d) => !legal || d !== eyebrow).map((d, i) => {
        const key = "k" in d ? d.k : `${d.c}-${i}`;
        switch (d.c) {
          case "linea":
          case "area": {
            const id = `b-${bloque.id}-${d.k}`;
            // Los títulos grandes son textarea que crece: un título largo baja de renglón y nunca se corta.
            const Comp = d.c === "linea" && !d.grande ? "input" : "textarea";
            return (
              <Campo key={key} etiqueta={d.label} htmlFor={id} ayuda={d.ayuda} accion={<Contador n={str(d.k).length} max={d.max} />}>
                <Comp
                  id={id}
                  value={str(d.k)}
                  maxLength={d.max}
                  rows={d.c === "area" ? 2 : Comp === "textarea" ? 1 : undefined}
                  placeholder={d.ph}
                  onChange={(e) => onCambio({ [d.k]: d.c === "linea" ? e.target.value.replace(/\n/g, " ") : e.target.value })}
                  className={d.grande
                    ? cn(entradaTitulo, "resize-none text-col-2xl leading-tight [field-sizing:content]")
                    : d.c === "area"
                      ? entradaArea
                      : entrada}
                />
              </Campo>
            );
          }
          case "html":
            return (
              <Campo key={key} etiqueta={d.label}>
                <EditorTexto
                  key={bloque.id}
                  etiqueta={d.label}
                  valor={str(d.k)}
                  onCambio={(html) => onCambio({ [d.k]: html })}
                  maximo={d.max}
                  minAlto={d.alto}
                  maxAlto={Math.max(420, (d.alto ?? 140) * 2)}
                  placeholder={d.ph}
                  deshabilitado={!editable}
                />
              </Campo>
            );
          case "medio": {
            const ref = v[d.k] as { medioId: string } | null;
            return (
              <Campo key={key} etiqueta={d.label}>
                <SlotMedio
                  className="max-w-[420px]"
                  aspecto={d.aspecto}
                  tipo={d.conVideo ? undefined : "FOTO"}
                  medioId={ref?.medioId ?? null}
                  etiqueta={d.label.toLowerCase()}
                  vacio={d.conVideo ? "Elegir foto o video" : "Elegir foto"}
                  onCambio={(m) => onCambio({ [d.k]: m ? { medioId: m.id } : null })}
                />
              </Campo>
            );
          }
          case "seg":
            return (
              <Campo key={key} etiqueta={d.label}>
                <Segmentado etiqueta={d.label} valor={str(d.k)} opciones={d.opciones} onCambio={(x) => onCambio({ [d.k]: x })} deshabilitado={!editable} />
              </Campo>
            );
          case "elegidos": {
            const modo = str(d.modoK);
            return (
              <Campo key={key} etiqueta={d.label} ayuda={modo === d.elegir ? undefined : d.ayudaAuto}>
                <Segmentado etiqueta={`Qué ${d.label.toLowerCase()} mostrar`} valor={modo} opciones={d.modos} onCambio={(x) => onCambio({ [d.modoK]: x })} deshabilitado={!editable} />
                {modo === d.elegir && (
                  <div className="mt-2">
                    <Elegidos
                      ids={(v[d.k] as string[]) ?? []}
                      opciones={opcionesDe(d.fuente, mapas)}
                      onCambio={(ids) => onCambio({ [d.k]: ids })}
                      max={d.max}
                      etiqueta={d.label.toLowerCase()}
                      editable={editable}
                    />
                  </div>
                )}
              </Campo>
            );
          }
          case "galeria":
            return (
              <Campo key={key} etiqueta="Fotos">
                <TiraMedios
                  refs={(v.medios as { medioId: string; leyenda?: string }[]) ?? []}
                  onCambio={(medios) => onCambio({ medios })}
                  max={30}
                  etiqueta="Fotos de la galería"
                />
              </Campo>
            );
          case "categoria": {
            const cats = Array.from(new Set(mapas.preguntas.map((p) => p.categoria).filter(Boolean)));
            const actual = str("categoria");
            const n = actual ? mapas.preguntas.filter((p) => p.categoria === actual).length : mapas.preguntas.length;
            return (
              <Campo key={key} etiqueta="Categoría" htmlFor={`b-${bloque.id}-cat`} ayuda={`${n} preguntas publicadas.`}>
                <select
                  id={`b-${bloque.id}-cat`}
                  value={actual}
                  onChange={(e) => onCambio({ categoria: e.target.value })}
                  className={cn(entradaSelect, "max-w-[360px]")}
                >
                  <option value="">Todas las categorías</option>
                  {[...cats, ...(actual && !cats.includes(actual) ? [actual] : [])].map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Campo>
            );
          }
          case "cifras":
            return <Cifras key={key} bloque={v} onCambio={onCambio} editable={editable} />;
          case "estilos":
            return <Estilos key={key} bloque={v} onCambio={onCambio} editable={editable} />;
          case "nota":
            return (
              <p key={key} className="border-l-2 border-col-gold pl-4 text-col-md leading-relaxed text-col-slate">
                {d.texto}
              </p>
            );
        }
      })}
    </div>
  );
}

// ── Listas internas ─────────────────────────────────────────────────────────

type Cifra = { id: string; valor: string; etiqueta: string };
type Estilo = { id: string; titulo: string; texto: string; medio: { medioId: string } | null; href: string };

function BotonSumar({ onClick, children, n, max }: { onClick: () => void; children: React.ReactNode; n: number; max: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-10 items-center gap-2 self-start text-col-sm font-medium text-col-slate transition-colors hover:text-col-ink"
    >
      <Plus className="h-4 w-4 text-col-gold" strokeWidth={1.5} /> {children}
      <span className="normal-case tracking-normal text-col-muted">
        ({n} de {max})
      </span>
    </button>
  );
}

function BotonQuitar({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-col-sm text-col-muted transition-colors hover:bg-col-base hover:text-col-alerta"
    >
      <Trash2 className="h-4 w-4" strokeWidth={1.5} />
    </button>
  );
}

function Cifras({ bloque, onCambio, editable }: { bloque: Valores; onCambio: (p: Patch) => void; editable: boolean }) {
  const items = (bloque.items as Cifra[]) ?? [];
  const set = (items: Cifra[]) => onCambio({ items });
  const cambiar = (id: string, c: Partial<Cifra>) => set(items.map((x) => (x.id === id ? { ...x, ...c } : x)));
  return (
    <Campo etiqueta="Cifras">
      <ListaOrdenable
        items={items}
        onOrden={set}
        deshabilitado={!editable}
        className="flex flex-col gap-2"
        render={(x, _i, asa) => (
          <div className="flex items-end gap-3 rounded-col-sm border border-col-line bg-col-surface px-2 py-2">
            {editable && <Asa asa={asa} label={x.etiqueta || "cifra"} className="mb-1" />}
            <input
              aria-label="Valor"
              value={x.valor}
              maxLength={20}
              placeholder="18"
              onChange={(e) => cambiar(x.id, { valor: e.target.value })}
              className={cn(entradaTitulo, "w-24 text-col-2xl leading-tight tabular-nums lining-nums")}
            />
            <input
              aria-label="Etiqueta"
              value={x.etiqueta}
              maxLength={80}
              placeholder="Años armando viajes"
              onChange={(e) => cambiar(x.id, { etiqueta: e.target.value })}
              className={cn(entrada, "flex-1")}
            />
            {editable && <BotonQuitar label="Quitar cifra" onClick={() => set(items.filter((y) => y.id !== x.id))} />}
          </div>
        )}
      />
      {editable && items.length < 6 && (
        <BotonSumar n={items.length} max={6} onClick={() => set([...items, { id: nuevoId(), valor: "", etiqueta: "" }])}>
          Sumar cifra
        </BotonSumar>
      )}
    </Campo>
  );
}

function Estilos({ bloque, onCambio, editable }: { bloque: Valores; onCambio: (p: Patch) => void; editable: boolean }) {
  const items = (bloque.items as Estilo[]) ?? [];
  const set = (items: Estilo[]) => onCambio({ items });
  const cambiar = (id: string, c: Partial<Estilo>) => set(items.map((x) => (x.id === id ? { ...x, ...c } : x)));
  return (
    <Campo etiqueta="Estilos">
      <ListaOrdenable
        items={items}
        onOrden={set}
        deshabilitado={!editable}
        className="flex flex-col gap-3"
        render={(x, _i, asa) => (
          <div className="grid grid-cols-[auto_120px_1fr_auto] items-start gap-4 rounded-col-sm border border-col-line bg-col-surface p-3">
            {editable ? <Asa asa={asa} label={x.titulo || "estilo"} /> : <span />}
            <SlotMedio
              aspecto={3 / 4}
              tipo="FOTO"
              medioId={x.medio?.medioId ?? null}
              etiqueta={`foto de ${x.titulo || "estilo"}`}
              vacio="Foto"
              onCambio={(m) => cambiar(x.id, { medio: m ? { medioId: m.id } : null })}
            />
            <div className="flex min-w-0 flex-col gap-3">
              <input
                aria-label="Título del estilo"
                value={x.titulo}
                maxLength={80}
                placeholder="Luna de miel"
                onChange={(e) => cambiar(x.id, { titulo: e.target.value })}
                className={cn(entradaTitulo, "text-col-xl leading-tight")}
              />
              <textarea
                aria-label="Texto del estilo"
                value={x.texto}
                maxLength={300}
                rows={2}
                placeholder="Islas, cenas en la arena y nadie más alrededor."
                onChange={(e) => cambiar(x.id, { texto: e.target.value })}
                className={cn(entradaArea, "min-h-11 text-col-md")}
              />
              <input
                aria-label="Enlace del estilo"
                value={x.href}
                maxLength={200}
                placeholder="/experiencias?estilo=luna-de-miel"
                onChange={(e) => cambiar(x.id, { href: e.target.value })}
                className={cn(entrada, "font-mono text-col-sm")}
              />
            </div>
            {editable && <BotonQuitar label="Quitar estilo" onClick={() => set(items.filter((y) => y.id !== x.id))} />}
          </div>
        )}
      />
      {editable && items.length < 8 && (
        <BotonSumar n={items.length} max={8} onClick={() => set([...items, { id: nuevoId(), titulo: "", texto: "", medio: null, href: "" }])}>
          Sumar estilo
        </BotonSumar>
      )}
    </Campo>
  );
}

/** Una línea para la lista de bloques: título, primeras palabras o un conteo. */
export function resumenBloque(b: Bloque): string {
  const v = b as unknown as Valores;
  if (b.tipo === "galeria") return [b.titulo, b.medios.length ? `${b.medios.length} fotos` : ""].filter(Boolean).join(" · ");
  if (b.tipo === "cifras" && !b.titulo) return b.items.map((i) => i.valor).filter(Boolean).join(" · ");
  const t = String(v.titulo ?? "").trim();
  if (t) return t;
  const texto = textoPlano(String(v.texto ?? ""));
  if (texto) return texto.split(" ").slice(0, 12).join(" ");
  return String(v.eyebrow ?? "").trim();
}
