"use client";

// Piezas de los formularios de consulta del sitio (Contactanos y la hoja de la
// experiencia): campos con filete inferior, contador, chips, canal, teléfono
// con prefijo, calendario de rango y el armado de lo que recibe la action.

import { useMemo, useState } from "react";
import { defaultCountries, parseCountry, usePhoneInput, type CountryIso2 } from "react-international-phone";
import { ArrowLeft, ArrowRight, Check, ChevronDown, Minus, Plus } from "lucide-react";
import { cn } from "@/components/lib/cn";

export const etiqueta = "text-[12px] uppercase tracking-[0.14em]";

export type Canal = "whatsapp" | "llamada" | "email";
export type TipoFecha = "rango" | "mes" | "";

export interface DatosConsulta {
  ocasion: string;
  destinos: string[];
  destinoLibre: string;
  estilos: string[];
  fechaTipo: TipoFecha;
  fechaDesde: string;
  fechaHasta: string;
  mesAproximado: string;
  noches: number | null;
  adultos: number;
  ninos: number;
  /** null = todavía sin elegir. */
  edadesNinos: (number | null)[];
  nombre: string;
  email: string;
  telPais: string;
  /** E.164 (+59899123456) tal cual lo arma el selector. */
  tel: string;
  canal: Canal;
  inversion: string;
  comentarios: string;
  aceptaNovedades: boolean;
}

export const DATOS_VACIOS: DatosConsulta = {
  ocasion: "",
  destinos: [],
  destinoLibre: "",
  estilos: [],
  fechaTipo: "",
  fechaDesde: "",
  fechaHasta: "",
  mesAproximado: "",
  noches: null,
  adultos: 2,
  ninos: 0,
  edadesNinos: [],
  nombre: "",
  email: "",
  telPais: "uy",
  tel: "",
  canal: "whatsapp",
  inversion: "",
  comentarios: "",
  aceptaNovedades: false,
};

export const CANALES: { id: Canal; nombre: string }[] = [
  { id: "whatsapp", nombre: "WhatsApp" },
  { id: "llamada", nombre: "Llamada" },
  { id: "email", nombre: "Email" },
];

export const OCASIONES = [
  { id: "Luna de miel", texto: "Dos, sin apuro" },
  { id: "Aniversario", texto: "Celebrar lo vivido" },
  { id: "Familia", texto: "Varias generaciones" },
  { id: "Amigos", texto: "Un grupo chico" },
  { id: "Otro", texto: "Contanos vos" },
];

export const ESTILOS = ["Naturaleza", "Cultura", "Gastronomía", "Bienestar", "Aventura suave", "Playa"];

export const INVERSIONES = ["Hasta USD 5.000", "USD 5.000 a 8.000", "USD 8.000 a 12.000", "USD 12.000 a 20.000", "Más de USD 20.000"];

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

export const emailValido = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

const PAISES = defaultCountries.map(parseCountry);
const PREFERIDOS: string[] = ["uy", "ar", "br", "cl", "py", "us", "es"];
const dialDe = (iso: string) => PAISES.find((p) => p.iso2 === iso)?.dialCode ?? "598";

/** El número sin el prefijo del país. */
export function telefonoNacional(d: Pick<DatosConsulta, "tel" | "telPais">) {
  const digitos = d.tel.replace(/\D/g, "");
  const dial = dialDe(d.telPais);
  return digitos.startsWith(dial) ? digitos.slice(dial.length) : digitos;
}

export type ErroresConsulta = Partial<Record<"nombre" | "email" | "tel" | "fechas" | "edades", string>>;

/** Los obligatorios de contacto: nombre, email y teléfono (propuesta 5.7). */
export function erroresContacto(d: DatosConsulta): ErroresConsulta {
  const e: ErroresConsulta = {};
  if (!d.nombre.trim()) e.nombre = "Nos falta tu nombre para saber a quién escribirle.";
  if (!d.email.trim()) e.email = "Nos falta tu email.";
  else if (!emailValido(d.email)) e.email = "Revisá el email: parece incompleto.";
  if (telefonoNacional(d).length < 6) e.tel = "Dejanos un teléfono para poder contactarte.";
  return e;
}

export function erroresFechas(d: DatosConsulta): ErroresConsulta {
  if (d.fechaTipo === "rango" && (!d.fechaDesde || !d.fechaHasta)) {
    return { fechas: d.fechaDesde ? "Tocá la fecha de vuelta." : "Elegí la salida y la vuelta, o pasá a “Todavía no sé”." };
  }
  if (d.fechaTipo === "mes" && !d.mesAproximado) return { fechas: "Elegí un mes aproximado." };
  return {};
}

/** Lo que recibe enviarConsultaCollection. */
export function armarEnvio(
  d: DatosConsulta,
  extra: { experienciaSlug?: string; website: string },
): Record<string, unknown> & { website?: string } {
  const destinos = [...d.destinos, ...d.destinoLibre.split(",")].map((x) => x.trim()).filter(Boolean).slice(0, 10);
  const nacional = telefonoNacional(d);
  return {
    tipo: extra.experienciaSlug ? "experiencia" : "contacto",
    ...(extra.experienciaSlug ? { experienciaSlug: extra.experienciaSlug } : {}),
    nombre: d.nombre.trim(),
    email: d.email.trim(),
    telefono: nacional,
    paisCodigo: nacional ? `+${dialDe(d.telPais)}` : null,
    ocasion: d.ocasion,
    destinos,
    estilo: d.estilos.join(", "),
    fechaTipo: d.fechaTipo,
    fechaDesde: d.fechaTipo === "rango" ? d.fechaDesde || null : null,
    fechaHasta: d.fechaTipo === "rango" ? d.fechaHasta || null : null,
    mesAproximado: d.fechaTipo === "mes" ? d.mesAproximado : "",
    noches: d.noches,
    adultos: d.adultos,
    ninos: d.ninos,
    edadesNinos: d.edadesNinos.slice(0, d.ninos).map((x) => x ?? 0),
    inversion: d.inversion,
    canal: d.canal,
    comentarios: d.comentarios.trim(),
    aceptaNovedades: d.aceptaNovedades,
    origenUrl: typeof window === "undefined" ? "" : window.location.href.slice(0, 500),
    website: extra.website,
  };
}

// ── Textos de resumen ───────────────────────────────────────────────────────

const fmtCorta = (iso: string) =>
  new Intl.DateTimeFormat("es-UY", { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));

export function resumenFechas(d: DatosConsulta) {
  if (d.fechaTipo === "rango") {
    if (d.fechaDesde && d.fechaHasta) return `${fmtCorta(d.fechaDesde)} al ${fmtCorta(d.fechaHasta)}`;
    if (d.fechaDesde) return `Desde el ${fmtCorta(d.fechaDesde)}`;
  }
  if (d.fechaTipo === "mes" && d.mesAproximado) return `Alrededor de ${d.mesAproximado.toLowerCase()}`;
  return "";
}

export function resumenViajeros(d: Pick<DatosConsulta, "adultos" | "ninos">) {
  const a = `${d.adultos} ${d.adultos === 1 ? "adulto" : "adultos"}`;
  return d.ninos ? `${a} y ${d.ninos} ${d.ninos === 1 ? "niño" : "niños"}` : a;
}

/** Los próximos 12 meses, empezando por el actual: "Marzo 2027". */
export function proximosMeses(): string[] {
  const hoy = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const m = (hoy.getMonth() + i) % 12;
    const a = hoy.getFullYear() + Math.floor((hoy.getMonth() + i) / 12);
    return `${MESES[m]} ${a}`;
  });
}

// ── Campos ──────────────────────────────────────────────────────────────────

export const claseInput = (error?: boolean) =>
  cn(
    "h-12 w-full min-w-0 rounded-none border-0 border-b bg-transparent px-0 text-[16px] text-col-ink placeholder:text-col-slate/70 transition-[border-color,box-shadow] duration-200 ease-col focus:outline-none focus:ring-0 focus-visible:outline-none",
    error ? "border-col-alerta focus:shadow-[0_1px_0_#9E3D2F]" : "border-col-slate focus:border-col-ink focus:shadow-[0_1px_0_#32373B]",
  );

export function ErrorCampo({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <span id={id} role="alert" className="flex items-start gap-2 text-[13px] leading-5 text-col-alerta">
      <span aria-hidden className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-col-alerta text-[11px] font-bold leading-none text-white">
        !
      </span>
      {children}
    </span>
  );
}

export function Campo({
  id,
  titulo,
  error,
  ayuda,
  className,
  children,
}: {
  id: string;
  titulo: string;
  error?: string;
  ayuda?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <label htmlFor={id} className={cn(etiqueta, "text-col-slate")}>
        {titulo}
      </label>
      {children}
      {error ? <ErrorCampo id={`${id}-error`}>{error}</ErrorCampo> : ayuda ? <span className="text-[13px] text-col-slate">{ayuda}</span> : null}
    </div>
  );
}

export function Chip({ activo, onClick, children }: { activo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={activo}
      onClick={onClick}
      className={cn(
        etiqueta,
        "inline-flex min-h-11 items-center gap-2 rounded-sm border px-4 py-2 text-left transition-colors duration-200 ease-col active:translate-y-px",
        activo ? "border-col-ink bg-col-ink text-col-base" : "border-col-line bg-col-surface text-col-ink hover:border-col-ink",
      )}
    >
      {activo && <Check aria-hidden className="h-3.5 w-3.5 shrink-0 text-col-gold" strokeWidth={2} />}
      {children}
    </button>
  );
}

export function Contador({
  titulo,
  ayuda,
  valor,
  min,
  max,
  onChange,
  vacio,
}: {
  titulo: string;
  ayuda?: string;
  valor: number | null;
  min: number;
  max: number;
  onChange: (v: number | null) => void;
  /** Texto cuando el valor es null (opcional sin definir). */
  vacio?: string;
}) {
  const n = valor ?? 0;
  const boton =
    "flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border border-col-ink text-col-ink transition-colors duration-200 ease-col hover:bg-col-base active:translate-y-px disabled:pointer-events-none disabled:opacity-30";
  return (
    <div className="flex items-center justify-between gap-4 border-b border-col-line py-3">
      <div className="flex min-w-0 flex-col">
        <span className="text-[16px] text-col-ink">{titulo}</span>
        {ayuda && <span className="text-[13px] text-col-slate">{ayuda}</span>}
      </div>
      <div className="flex shrink-0 items-center gap-3 sm:gap-5">
        <button
          type="button"
          aria-label={`Menos ${titulo.toLowerCase()}`}
          className={boton}
          disabled={valor === null || (vacio === undefined && n <= min)}
          onClick={() => onChange(vacio !== undefined && n <= min ? null : n - 1)}
        >
          <Minus aria-hidden className="h-4 w-4" strokeWidth={1.5} />
        </button>
        <span aria-live="polite" className="min-w-[44px] text-center font-col-display text-[30px] leading-none tabular-nums">
          {valor === null ? <span className="text-[15px] font-col-text text-col-slate">{vacio}</span> : valor}
        </span>
        <button
          type="button"
          aria-label={`Más ${titulo.toLowerCase()}`}
          className={boton}
          disabled={n >= max}
          onClick={() => onChange(valor === null ? min : n + 1)}
        >
          <Plus aria-hidden className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}

export function SelectorCanal({ valor, onChange, nombre }: { valor: Canal; onChange: (c: Canal) => void; nombre: string }) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className={cn(etiqueta, "mb-3 text-col-slate")}>Canal preferido</legend>
      <div className="flex flex-wrap gap-x-8 gap-y-1">
        {CANALES.map((c) => (
          <label key={c.id} className="flex min-h-11 cursor-pointer items-center gap-3 text-[16px] text-col-ink">
            <input
              type="radio"
              name={nombre}
              value={c.id}
              checked={valor === c.id}
              onChange={() => onChange(c.id)}
              className="peer sr-only"
            />
            <span
              aria-hidden
              className="flex h-5 w-5 items-center justify-center rounded-full border border-col-slate peer-checked:border-col-ink peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-col-gold [&>span]:scale-0 peer-checked:[&>span]:scale-100"
            >
              <span className="h-2.5 w-2.5 rounded-full bg-col-ink transition-transform duration-200 ease-col" />
            </span>
            {c.nombre}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function Casilla({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-start gap-3 py-2 text-[15px] leading-6 text-col-ink">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span
        aria-hidden
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border border-col-ink bg-col-surface transition-colors duration-200 ease-col peer-checked:bg-col-ink peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-col-gold [&>svg]:opacity-0 peer-checked:[&>svg]:opacity-100"
      >
        <Check className="h-3.5 w-3.5 text-col-base" strokeWidth={2.5} />
      </span>
      <span>{children}</span>
    </label>
  );
}

/** Teléfono con prefijo de país: selector nativo (cómodo en el celular) y el número formateado. */
export function CampoTelefono({
  id,
  pais,
  valor,
  error,
  onChange,
}: {
  id: string;
  pais: string;
  valor: string;
  error?: string;
  onChange: (v: { telPais: string; tel: string }) => void;
}) {
  const paises = useMemo(
    () =>
      [...PAISES].sort((a, b) => {
        const ia = PREFERIDOS.indexOf(a.iso2);
        const ib = PREFERIDOS.indexOf(b.iso2);
        if (ia === -1 && ib === -1) return a.name.localeCompare(b.name);
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
      }),
    [],
  );
  const { inputValue, country, setCountry, handlePhoneValueChange, inputRef } = usePhoneInput({
    defaultCountry: (pais || "uy") as CountryIso2,
    value: valor,
    countries: defaultCountries,
    disableDialCodeAndPrefix: true,
    onChange: (d) => {
      if (d.phone !== valor || d.country.iso2 !== pais) onChange({ telPais: d.country.iso2, tel: d.phone });
    },
  });

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-4">
        <div className="flex flex-col gap-2">
          <span className={cn(etiqueta, "text-col-slate")} aria-hidden>
            Prefijo
          </span>
          <span className="relative flex h-12 items-center justify-between border-b border-col-slate text-[16px] text-col-ink focus-within:border-col-ink focus-within:shadow-[0_1px_0_#32373B]">
            +{country.dialCode}
            <ChevronDown aria-hidden className="h-4 w-4 text-col-slate" strokeWidth={1.5} />
            <select
              aria-label="País del teléfono"
              value={country.iso2}
              onChange={(e) => setCountry(e.target.value as CountryIso2)}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            >
              {paises.map((p) => (
                <option key={p.iso2} value={p.iso2}>
                  {p.name} (+{p.dialCode})
                </option>
              ))}
            </select>
          </span>
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <label htmlFor={id} className={cn(etiqueta, "text-col-slate")}>
            Teléfono
          </label>
          <input
            id={id}
            data-campo="tel"
            ref={inputRef}
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            value={inputValue}
            onChange={handlePhoneValueChange}
            placeholder="99 123 456"
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : undefined}
            className={claseInput(!!error)}
          />
        </div>
      </div>
      {error && <ErrorCampo id={`${id}-error`}>{error}</ErrorCampo>}
    </div>
  );
}

// ── Calendario de rango ─────────────────────────────────────────────────────

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Tocá la salida y después la vuelta. No deja elegir días pasados. */
export function CalendarioRango({
  desde,
  hasta,
  onChange,
}: {
  desde: string;
  hasta: string;
  onChange: (v: { desde: string; hasta: string }) => void;
}) {
  const hoy = iso(new Date());
  const [mes, setMes] = useState(() => {
    const base = desde ? new Date(`${desde}T12:00:00`) : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const primerMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const dias = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
  const corrimiento = (mes.getDay() + 6) % 7; // lunes primero
  const celdas = [
    ...Array.from({ length: corrimiento }, () => null),
    ...Array.from({ length: dias }, (_, i) => iso(new Date(mes.getFullYear(), mes.getMonth(), i + 1))),
  ];
  const nombreMes = `${MESES[mes.getMonth()]} ${mes.getFullYear()}`;

  const elegir = (d: string) => {
    if (!desde || hasta || d < desde) onChange({ desde: d, hasta: "" });
    else onChange({ desde, hasta: d === desde ? "" : d });
  };
  const flecha =
    "flex h-9 w-9 items-center justify-center rounded-sm border border-col-line text-col-ink transition-colors duration-200 ease-col hover:border-col-ink disabled:pointer-events-none disabled:opacity-30";

  return (
    <div className="flex w-full max-w-[340px] flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="font-col-display text-[24px] leading-none" aria-live="polite">
          {nombreMes}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            aria-label="Mes anterior"
            className={flecha}
            disabled={mes <= primerMes}
            onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))}
          >
            <ArrowLeft aria-hidden className="h-4 w-4" strokeWidth={1.25} />
          </button>
          <button
            type="button"
            aria-label="Mes siguiente"
            className={flecha}
            onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))}
          >
            <ArrowRight aria-hidden className="h-4 w-4" strokeWidth={1.25} />
          </button>
        </div>
      </div>
      <div role="grid" aria-label={nombreMes} className="grid grid-cols-7 gap-1">
        {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
          <span key={i} aria-hidden className={cn(etiqueta, "flex h-7 items-center justify-center text-col-slate")}>
            {d}
          </span>
        ))}
        {celdas.map((d, i) => {
          if (!d) return <span key={`v${i}`} />;
          const borde = d === desde || d === hasta;
          const dentro = desde && hasta && d > desde && d < hasta;
          const pasado = d < hoy;
          return (
            <button
              key={d}
              type="button"
              disabled={pasado}
              aria-pressed={borde || !!dentro}
              aria-label={fmtCorta(d)}
              onClick={() => elegir(d)}
              className={cn(
                "flex aspect-square w-full items-center justify-center rounded-sm text-[15px] tabular-nums transition-colors duration-200 ease-col disabled:opacity-30",
                borde ? "bg-col-ink text-col-base" : dentro ? "bg-[#F1E7D9] text-col-ink" : "text-col-ink hover:shadow-[inset_0_0_0_1px_#32373B]",
              )}
            >
              {Number(d.slice(8))}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Dos caminos para las fechas (RN06): "Sí, tengo fechas" o "Todavía no sé". */
export function InterruptorFechas({ valor, onChange }: { valor: TipoFecha; onChange: (v: TipoFecha) => void }) {
  const op = (v: TipoFecha, texto: string) => (
    <button
      type="button"
      aria-pressed={valor === v}
      onClick={() => onChange(valor === v ? "" : v)}
      className={cn(
        etiqueta,
        "h-12 px-3 transition-colors duration-300 ease-col",
        valor === v ? "bg-col-ink text-col-base" : "bg-transparent text-col-ink hover:bg-col-base",
      )}
    >
      {texto}
    </button>
  );
  return (
    <div className="grid w-full max-w-[440px] grid-cols-2 overflow-hidden rounded-sm border border-col-ink">
      {op("rango", "Sí, tengo fechas")}
      {op("mes", "Todavía no sé")}
    </div>
  );
}

/** Honeypot: oculto para las personas, los bots lo completan. */
export function CampoTrampa({ valor, onChange }: { valor: string; onChange: (v: string) => void }) {
  return (
    <div aria-hidden className="sr-only">
      <label>
        Sitio web
        <input type="text" name="website" tabIndex={-1} autoComplete="off" value={valor} onChange={(e) => onChange(e.target.value)} />
      </label>
    </div>
  );
}
