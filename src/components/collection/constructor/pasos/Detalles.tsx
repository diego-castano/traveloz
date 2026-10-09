"use client";

// Paso 7: detalles. Qué incluye y qué no, información práctica y precio.

import { useState } from "react";
import { Check, CloudSun, Coins, EyeOff, HeartPulse, Languages, Plane, Plus, Stamp, X } from "lucide-react";
import type { InfoPractica } from "@/lib/collection/experiencia/contenido";
import { cn } from "@/components/lib/cn";
import { Interruptor } from "../../ui";
import { Asa, Campo, Contador, Grupo, ListaOrdenable, inputLinea } from "../campos";
import { useConstructor } from "../contexto";
import { nuevoId } from "../estado";
import { fmtMiles } from "../formato";

const INFO: { id: keyof InfoPractica; label: string; icono: typeof Languages; max: number; ejemplo: string }[] = [
  { id: "idioma", label: "Idioma", icono: Languages, max: 200, ejemplo: "Inglés y filipino. Los guías hablan inglés." },
  { id: "moneda", label: "Moneda", icono: Coins, max: 200, ejemplo: "Peso filipino. Tarjetas en hoteles." },
  { id: "visado", label: "Visado", icono: Stamp, max: 600, ejemplo: "Sin visado hasta 30 días para pasaporte uruguayo." },
  { id: "comoLlegar", label: "Cómo llegar", icono: Plane, max: 600, ejemplo: "Vía Doha o Estambul, con una escala." },
  { id: "salud", label: "Salud", icono: HeartPulse, max: 600, ejemplo: "Sin vacunas obligatorias." },
  { id: "clima", label: "Clima", icono: CloudSun, max: 600, ejemplo: "Tropical. De diciembre a abril, mar calmo." },
];

export function PasoDetalles() {
  const { borrador, setContenido, setCampos, editable } = useConstructor();
  const k = borrador.contenido;
  const c = borrador.campos;
  const [monto, setMonto] = useState(c.precioDesde ? fmtMiles(c.precioDesde) : "");

  return (
    <div className="flex flex-col gap-12">
      <div className="flex flex-col gap-10">
        <ListaTexto
          titulo="Incluye"
          icono="si"
          valores={k.incluye}
          onCambio={(incluye) => setContenido(() => ({ incluye }))}
          placeholder="Traslados privados en cada destino"
        />
        <ListaTexto
          titulo="No incluye"
          icono="no"
          valores={k.noIncluye}
          onCambio={(noIncluye) => setContenido(() => ({ noIncluye }))}
          placeholder="Vuelos internacionales"
        />
      </div>

      <Grupo titulo="Información práctica" ayuda="Lo que alguien pregunta antes de decidir.">
        <div className="grid grid-cols-1 gap-x-8 gap-y-7 sm:grid-cols-2">
          {INFO.map(({ id, label, icono: Icono, max, ejemplo }) => (
            <Campo
              key={id}
              etiqueta={label}
              htmlFor={`info-${id}`}
              accion={k.info[id].length > max * 0.7 ? <Contador n={k.info[id].length} max={max} /> : null}
            >
              <div className="relative">
                <Icono className="pointer-events-none absolute left-0 top-3 h-4 w-4 text-col-gold" strokeWidth={1.4} aria-hidden />
                <textarea
                  id={`info-${id}`}
                  rows={1}
                  value={k.info[id]}
                  maxLength={max}
                  onChange={(e) => setContenido((x) => ({ info: { ...x.info, [id]: e.target.value } }))}
                  placeholder={ejemplo}
                  className={cn(inputLinea, "resize-none pl-7 text-[14px] leading-relaxed [field-sizing:content]")}
                />
              </div>
            </Campo>
          ))}
        </div>
      </Grupo>

      <Grupo titulo="Precio">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-[15px] text-col-ink">Mostrar precio</p>
            <p className="mt-0.5 text-[13px] text-col-slate">Un monto «desde» en dólares, por persona.</p>
          </div>
          <Interruptor
            checked={c.mostrarPrecio}
            onCheckedChange={(v) => setCampos({ mostrarPrecio: v })}
            disabled={!editable}
            label="Mostrar precio"
          />
        </div>
        {c.mostrarPrecio ? (
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-[220px_1fr]">
            <Campo
              etiqueta="Desde"
              htmlFor="precio-monto"
              error={(c.precioDesde ?? 0) > 0 ? null : "Falta el monto."}
            >
              <div className="flex items-baseline gap-2 border-b border-col-slate/40 focus-within:border-col-gold">
                <span className="text-[13px] uppercase tracking-[0.12em] text-col-slate">USD</span>
                <input
                  id="precio-monto"
                  inputMode="numeric"
                  value={monto}
                  onChange={(e) => {
                    const n = Number(e.target.value.replace(/\D/g, "").slice(0, 7));
                    setMonto(n ? fmtMiles(n) : "");
                    setCampos({ precioDesde: n ? Math.min(n, 1_000_000) : null });
                  }}
                  placeholder="5.099"
                  className="w-full border-0 bg-transparent px-0 py-2 font-col-display text-[32px] tabular-nums lining-nums text-col-ink focus:outline-none focus:ring-0"
                />
              </div>
            </Campo>
            <Campo etiqueta="Nota" htmlFor="precio-nota" accion={<Contador n={k.precioNota.length} max={200} />}>
              <input
                id="precio-nota"
                value={k.precioNota}
                maxLength={200}
                onChange={(e) => setContenido(() => ({ precioNota: e.target.value }))}
                className={cn(inputLinea, "mt-3 text-[14px]")}
              />
            </Campo>
          </div>
        ) : (
          <p className="flex items-center gap-3 rounded-sm bg-col-base px-4 py-3 text-[14px] text-col-slate">
            <EyeOff className="h-4 w-4 shrink-0 text-col-slate/70" strokeWidth={1.5} aria-hidden />
            El sitio no muestra ningún precio. La consulta lleva al especialista.
          </p>
        )}
      </Grupo>
    </div>
  );
}

function ListaTexto({
  titulo,
  icono,
  valores,
  onCambio,
  placeholder,
}: {
  titulo: string;
  icono: "si" | "no";
  valores: string[];
  onCambio: (v: string[]) => void;
  placeholder: string;
}) {
  const { editable } = useConstructor();
  const [nuevo, setNuevo] = useState("");
  // Ids estables para ordenar (el contenido guarda solo textos).
  const [ids, setIds] = useState<string[]>(() => valores.map(() => nuevoId()));
  const idsAlineados = valores.map((_, i) => ids[i] ?? `${titulo}-${i}`);
  const items = valores.map((texto, i) => ({ id: idsAlineados[i], texto }));

  const agregar = () => {
    const t = nuevo.trim();
    if (!t || valores.length >= 30) return;
    setIds([...idsAlineados, nuevoId()]);
    onCambio([...valores, t.slice(0, 200)]);
    setNuevo("");
  };
  const Icono = icono === "si" ? Check : X;

  return (
    <section>
      <h3 className="mb-4 font-col-display text-[24px] font-normal leading-none text-col-ink">{titulo}</h3>
      <ListaOrdenable
        items={items}
        deshabilitado={!editable}
        onOrden={(xs) => {
          setIds(xs.map((x) => x.id));
          onCambio(xs.map((x) => x.texto));
        }}
        className="flex flex-col"
        render={(it, i, asa) => (
          <div className={cn("group flex items-center gap-1 bg-col-base", asa.arrastrando && "shadow-[0_12px_24px_-12px_rgba(50,55,59,0.4)]")}>
            {editable && <Asa asa={asa} label={it.texto} className="-ml-2 opacity-0 group-hover:opacity-100 focus-visible:opacity-100" />}
            <Icono className={cn("h-3.5 w-3.5 shrink-0", icono === "si" ? "text-col-gold" : "text-col-slate/60")} strokeWidth={2} aria-hidden />
            <input
              aria-label={`${titulo}, ítem ${i + 1}`}
              value={it.texto}
              maxLength={200}
              onChange={(e) => onCambio(valores.map((v, j) => (j === i ? e.target.value : v)))}
              onBlur={() => {
                if (!it.texto.trim()) {
                  setIds(idsAlineados.filter((_, j) => j !== i));
                  onCambio(valores.filter((_, j) => j !== i));
                }
              }}
              className="min-w-0 flex-1 border-0 border-b border-transparent bg-transparent px-1 py-2 text-[14px] text-col-ink hover:border-col-line focus:border-col-gold focus:outline-none focus:ring-0"
            />
            {editable && (
              <button
                type="button"
                aria-label={`Quitar ${it.texto}`}
                onClick={() => {
                  setIds(idsAlineados.filter((_, j) => j !== i));
                  onCambio(valores.filter((_, j) => j !== i));
                }}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm text-col-slate/50 opacity-0 transition-opacity hover:text-col-alerta focus:opacity-100 group-hover:opacity-100"
              >
                <X className="h-3.5 w-3.5" strokeWidth={1.75} />
              </button>
            )}
          </div>
        )}
      />
      {editable && valores.length < 30 && (
        <div className="mt-2 flex items-center gap-2">
          <Plus className="h-3.5 w-3.5 shrink-0 text-col-slate/60" strokeWidth={1.75} aria-hidden />
          <input
            aria-label={`Sumar a ${titulo}`}
            value={nuevo}
            maxLength={200}
            onChange={(e) => setNuevo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                agregar();
              }
            }}
            placeholder={`${placeholder} y Enter`}
            className={cn(inputLinea, "px-1 py-2 text-[14px]")}
          />
        </div>
      )}
    </section>
  );
}
