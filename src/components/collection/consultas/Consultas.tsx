"use client";

// Panel de consultas de Collection: lo que llega del sitio, con su estado en
// Bitrix, y la lista de suscriptores del newsletter. Filas que se apilan en
// el celular (nada de tablas con scroll horizontal) y el detalle en una hoja.

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { ArrowUpRight, Download, LoaderCircle, Mail, MessageCircle, Phone, RotateCcw } from "lucide-react";
import type { ConsultaFila } from "@/actions/collection/consultas-admin.actions";
import { canalLegible, textoFechas, textoViajeros } from "@/lib/collection/consultas";
import { cn } from "@/components/lib/cn";
import { useCollection } from "../shell/contexto";
import { useAviso } from "../shell/Avisos";
import { Boton, Buscador, EncabezadoPagina, Estado, type TonoEstado, Filtros, Skeleton, barraHerramientas, boton, type OpcionFiltro, entradaArea } from "../ui";
import { Hoja, useGuardadoDiferido } from "../contenido/comun";
import { haceTiempo } from "../constructor/formato";
import { rutaSitio } from "../sitio/tarjetas";
import { urlAbsoluta } from "@/lib/collection/sitio";
import { apiConsultasReal, EVENTO_CONSULTAS, type ApiConsultas, type DetalleConsulta, type Suscriptor } from "./api";

const EASE = [0.22, 1, 0.36, 1] as const;

type Estado = ConsultaFila["estado"];
type Inicial = { items: ConsultaFila[]; siguiente: string | null } | { error: string };
type FiltroEstado = Estado | "TODAS";

const ESTADOS: Record<Estado, { label: string; tono: TonoEstado }> = {
  NUEVA: { label: "Nueva", tono: "info" },
  EN_CURSO: { label: "En curso", tono: "aviso" },
  CERRADA: { label: "Cerrada", tono: "ok" },
  DESCARTADA: { label: "Descartada", tono: "neutro" },
};

const FILTROS: OpcionFiltro<FiltroEstado>[] = [
  { id: "TODAS", label: "Todas" },
  { id: "NUEVA", label: "Nuevas" },
  { id: "EN_CURSO", label: "En curso" },
  { id: "CERRADA", label: "Cerradas" },
  { id: "DESCARTADA", label: "Descartadas" },
];

const CRM = {
  OK: { punto: "bg-col-ok", texto: "Enviada a Bitrix" },
  ERROR: { punto: "bg-col-error", texto: "Falló el envío a Bitrix" },
  PENDIENTE: { punto: "bg-col-aviso", texto: "Enviando a Bitrix" },
  NADA: { punto: "border border-col-subtle bg-transparent", texto: "No se manda a Bitrix" },
};
const crmDe = (e: ConsultaFila["crmEstado"]) => CRM[e ?? "NADA"];

function PildoraEstado({ estado, className }: { estado: Estado; className?: string }) {
  const e = ESTADOS[estado];
  return (
    <Estado tono={e.tono} className={className}>
      {e.label}
    </Estado>
  );
}

function PuntoCrm({ estado }: { estado: ConsultaFila["crmEstado"] }) {
  const c = crmDe(estado);
  return (
    <span title={c.texto} className="flex h-6 w-6 items-center justify-center">
      <span aria-hidden className={cn("h-2 w-2 rounded-full", c.punto)} />
      <span className="sr-only">{c.texto}</span>
    </span>
  );
}

export function Consultas({
  inicial,
  api = apiConsultasReal,
}: {
  inicial: Inicial;
  api?: ApiConsultas;
}) {
  const params = useSearchParams();
  const [pestana, setPestana] = useState<"consultas" | "newsletter">(params.get("tab") === "newsletter" ? "newsletter" : "consultas");
  const [abierta, setAbierta] = useState<string | null>(params.get("abrir"));

  // ?abrir=<id> sin recargar la página (lo usa el link del mail de aviso).
  const abrir = useCallback((id: string | null) => {
    setAbierta(id);
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("abrir", id);
    else url.searchParams.delete("abrir");
    window.history.replaceState(null, "", url);
  }, []);

  return (
    <div className="mx-auto max-w-[1280px]">
      <EncabezadoPagina
        titulo="Consultas"
        descripcion="Lo que llega desde el sitio de Collection, con su paso por Bitrix."
      />
      <div role="tablist" aria-label="Secciones" className="mb-10 flex gap-8 border-b border-col-line">
        {(["consultas", "newsletter"] as const).map((p) => (
          <button
            key={p}
            role="tab"
            type="button"
            aria-selected={pestana === p}
            onClick={() => setPestana(p)}
            className={cn(
              "relative -mb-px h-11 text-col-md font-medium transition-colors duration-col ease-col",
              pestana === p ? "text-col-ink" : "text-col-slate hover:text-col-ink",
            )}
          >
            {p === "consultas" ? "Consultas" : "Newsletter"}
            {pestana === p && <motion.span layoutId="col-consultas-tab" className="absolute inset-x-0 bottom-0 h-[2px] bg-col-gold" />}
          </button>
        ))}
      </div>
      {pestana === "consultas" ? (
        <ListaConsultas inicial={inicial} api={api} abierta={abierta} onAbrir={abrir} />
      ) : (
        <Newsletter api={api} />
      )}
    </div>
  );
}

// ── Consultas ───────────────────────────────────────────────────────────────

function ListaConsultas({
  inicial,
  api,
  abierta,
  onAbrir,
}: {
  inicial: Inicial;
  api: ApiConsultas;
  abierta: string | null;
  onAbrir: (id: string | null) => void;
}) {
  const avisar = useAviso();
  const [filtro, setFiltro] = useState<FiltroEstado>("TODAS");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<ConsultaFila[]>("items" in inicial ? inicial.items : []);
  const [siguiente, setSiguiente] = useState<string | null>("items" in inicial ? inicial.siguiente : null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>("error" in inicial ? inicial.error : null);
  const primera = useRef(true);
  const pedido = useRef(0);

  const cargar = useCallback(
    async (cursor?: string) => {
      const n = ++pedido.current;
      setCargando(true);
      const r = await api
        .listar({ estado: filtro === "TODAS" ? undefined : filtro, q: q.trim() || undefined, cursor })
        .catch(() => ({ ok: false as const, error: "Sin conexión. Probá de nuevo." }));
      if (n !== pedido.current) return;
      setCargando(false);
      if (!r.ok) return setError(r.error);
      setError(null);
      setItems((xs) => (cursor ? [...xs, ...r.data.items] : r.data.items));
      setSiguiente(r.data.siguiente);
    },
    [api, filtro, q],
  );

  useEffect(() => {
    // La primera página ya vino del servidor.
    if (primera.current) {
      primera.current = false;
      return;
    }
    const t = window.setTimeout(() => void cargar(), q ? 300 : 0);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtro, q]);

  const cambiarFila = (id: string, p: Partial<ConsultaFila>) => setItems((xs) => xs.map((x) => (x.id === id ? { ...x, ...p } : x)));

  return (
    <>
      <div className={barraHerramientas}>
        <Filtros etiqueta="Estado" opciones={FILTROS} valor={filtro} onChange={setFiltro} />
        <Buscador valor={q} onChange={setQ} placeholder="Nombre, email o TC-0412" etiqueta="Buscar consultas" />
      </div>

      {error && (
        <p role="alert" className="mb-6 text-col-md text-col-alerta">
          {error}
        </p>
      )}

      {cargando && items.length === 0 ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-[76px] w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-start gap-4 border-t border-col-line py-16">
          <span aria-hidden className="h-px w-12 bg-col-gold" />
          <p className="font-col-display text-col-2xl leading-tight text-col-ink">
            {q || filtro !== "TODAS" ? "Nada con ese filtro" : "Todavía no llegaron consultas"}
          </p>
          <p className="max-w-[52ch] text-col-cuerpo leading-relaxed text-col-slate">
            {q || filtro !== "TODAS"
              ? "Probá con otro estado o borrá la búsqueda."
              : "Cuando alguien escriba desde una experiencia o desde Contactanos, aparece acá y le llega el aviso al especialista."}
          </p>
        </div>
      ) : (
        <>
        <div aria-hidden className="hidden px-4 pb-2 text-col-xs font-medium text-col-muted lg:grid lg:grid-cols-[104px_minmax(0,1.3fr)_minmax(0,1.2fr)_minmax(0,0.8fr)_112px_24px] lg:gap-x-6">
          <span>Código</span>
          <span>Persona</span>
          <span>Origen</span>
          <span>Especialista</span>
          <span>Estado</span>
          <span title="Bitrix">CRM</span>
        </div>
        <ul className={cn("flex flex-col border-t border-col-line transition-opacity duration-col", cargando && "opacity-60")}>
          {items.map((c, i) => (
            <motion.li
              key={c.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: EASE, delay: Math.min(i, 10) * 0.025 }}
              className="border-b border-col-line"
            >
              <button
                type="button"
                onClick={() => onAbrir(c.id)}
                className={cn(
                  "grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 px-2 py-4 text-left transition-colors duration-col ease-col hover:bg-col-surface lg:grid-cols-[104px_minmax(0,1.3fr)_minmax(0,1.2fr)_minmax(0,0.8fr)_112px_24px] lg:gap-x-6 lg:px-4",
                  abierta === c.id && "bg-col-surface",
                )}
              >
                <span className="col-start-1 flex items-baseline gap-3 lg:flex-col lg:gap-0.5">
                  <span className="font-mono text-col-xs text-col-ink">{c.numero}</span>
                  <span className="text-col-xs text-col-slate">{haceTiempo(c.fecha)}</span>
                </span>
                <span className="col-start-1 flex min-w-0 flex-col lg:col-start-2 lg:row-start-1">
                  <span className={cn("truncate text-col-cuerpo text-col-ink", c.estado === "NUEVA" && "font-bold")}>{c.nombre}</span>
                  <span className="truncate text-col-sm text-col-slate">{c.email}</span>
                </span>
                <span className="col-span-2 col-start-1 min-w-0 truncate text-col-md text-col-ink lg:col-span-1 lg:col-start-3 lg:row-start-1">
                  {c.experiencia ? (
                    <span className="font-col-display text-col-lg">{c.experiencia}</span>
                  ) : (
                    <span className="text-col-sm text-col-slate">Contactanos</span>
                  )}
                </span>
                <span className="col-start-1 hidden min-w-0 truncate text-col-sm text-col-slate lg:col-start-4 lg:row-start-1 lg:block">
                  {c.especialista ?? "Sin especialista"}
                </span>
                <span className="col-start-2 row-span-2 row-start-1 flex items-center justify-end gap-2 self-start lg:col-start-5 lg:row-span-1 lg:justify-start lg:self-center">
                  <PildoraEstado estado={c.estado} />
                  <span className="lg:hidden">
                    <PuntoCrm estado={c.crmEstado} />
                  </span>
                </span>
                <span className="hidden lg:col-start-6 lg:row-start-1 lg:block">
                  <PuntoCrm estado={c.crmEstado} />
                </span>
              </button>
            </motion.li>
          ))}
        </ul>
        </>
      )}

      {siguiente && (
        <div className="mt-8 flex justify-center">
          <Boton variante="secundario" onClick={() => void cargar(siguiente)} disabled={cargando}>
            {cargando && <LoaderCircle className="h-4 w-4 animate-spin" />}
            Cargar más
          </Boton>
        </div>
      )}

      <DetalleHoja
        id={abierta}
        api={api}
        onCerrar={() => onAbrir(null)}
        onCambio={(id, p) => {
          cambiarFila(id, p);
          window.dispatchEvent(new Event(EVENTO_CONSULTAS));
        }}
        onError={(e) => avisar(e, "error")}
      />
    </>
  );
}

// ── Detalle ─────────────────────────────────────────────────────────────────

const fmtFechaHora = (d: Date | string) =>
  new Intl.DateTimeFormat("es-UY", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Montevideo",
  }).format(new Date(d));

function DetalleHoja({
  id,
  api,
  onCerrar,
  onCambio,
  onError,
}: {
  id: string | null;
  api: ApiConsultas;
  onCerrar: () => void;
  onCambio: (id: string, p: Partial<ConsultaFila>) => void;
  onError: (e: string) => void;
}) {
  const { puede } = useCollection();
  const [c, setC] = useState<DetalleConsulta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nota, setNota] = useState("");
  const [reintentando, setReintentando] = useState(false);

  const traer = useCallback(
    async (cid: string) => {
      const r = await api.obtener(cid).catch(() => ({ ok: false as const, error: "Sin conexión. Probá de nuevo." }));
      if (!r.ok) return setError(r.error);
      setC(r.data);
      setNota(r.data.notaInterna);
      setError(null);
    },
    [api],
  );

  useEffect(() => {
    setC(null);
    setError(null);
    if (id) void traer(id);
  }, [id, traer]);

  const guardarNota = useCallback(
    (v: string) => (c ? api.actualizar(c.id, { notaInterna: v }) : Promise.resolve({ ok: true as const, data: null })),
    [api, c],
  );
  const { estado: estadoNota, ya } = useGuardadoDiferido(nota, c?.id ?? null, guardarNota, !!c && puede("consultas.ver"));

  const cambiarEstado = async (estado: Estado) => {
    if (!c || c.estado === estado) return;
    const previo = c.estado;
    setC({ ...c, estado });
    onCambio(c.id, { estado });
    const r = await api.actualizar(c.id, { estado }).catch(() => ({ ok: false as const, error: "Sin conexión. Probá de nuevo." }));
    if (!r.ok) {
      setC((x) => (x ? { ...x, estado: previo } : x));
      onCambio(c.id, { estado: previo });
      onError(r.error);
    }
  };

  const reintentar = async () => {
    if (!c) return;
    setReintentando(true);
    const r = await api.reintentarBitrix(c.id).catch(() => ({ ok: false as const, error: "Sin conexión. Probá de nuevo." }));
    setReintentando(false);
    if (!r.ok) return onError(r.error);
    if (r.data.resultado === "ERROR") onError("Bitrix volvió a fallar. El detalle quedó abajo.");
    await traer(c.id);
    const nuevo = r.data.resultado === "OK" ? "OK" : r.data.resultado === "ERROR" ? "ERROR" : undefined;
    if (nuevo) onCambio(c.id, { crmEstado: nuevo });
  };

  const cerrar = () => {
    void ya();
    onCerrar();
  };

  return (
    <Hoja abierta={!!id} titulo={c ? `${c.numeroTexto} · ${c.nombre}` : "Consulta"} estado={estadoNota} onCerrar={cerrar}>
      {error ? (
        <p role="alert" className="p-6 text-col-md text-col-alerta">
          {error}
        </p>
      ) : !c ? (
        <div className="flex flex-col gap-4 p-6">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <ContenidoDetalle
          c={c}
          nota={nota}
          onNota={setNota}
          onEstado={(e) => void cambiarEstado(e)}
          reintentando={reintentando}
          onReintentar={() => void reintentar()}
        />
      )}
    </Hoja>
  );
}

function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-t border-col-line px-5 py-6 sm:px-6">
      <h3 className="flex items-center gap-3 text-col-xs uppercase tracking-[0.14em] text-col-slate">
        <span aria-hidden className="h-px w-5 bg-col-gold" />
        {titulo}
      </h3>
      {children}
    </section>
  );
}

function Datos({ filas }: { filas: { t: string; v: React.ReactNode }[] }) {
  const visibles = filas.filter((f) => f.v !== "" && f.v !== null && f.v !== undefined);
  if (!visibles.length) return <p className="text-col-md text-col-slate">Sin datos.</p>;
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-[132px_minmax(0,1fr)]">
      {visibles.map((f) => (
        <div key={f.t} className="contents">
          <dt className="text-col-sm text-col-slate">{f.t}</dt>
          <dd className="-mt-2 min-w-0 break-words text-col-cuerpo text-col-ink sm:mt-0">{f.v}</dd>
        </div>
      ))}
    </dl>
  );
}

function ContenidoDetalle({
  c,
  nota,
  onNota,
  onEstado,
  reintentando,
  onReintentar,
}: {
  c: DetalleConsulta;
  nota: string;
  onNota: (v: string) => void;
  onEstado: (e: Estado) => void;
  reintentando: boolean;
  onReintentar: () => void;
}) {
  const tel = [c.paisCodigo, c.telefono].filter(Boolean).join(" ");
  const digitos = tel.replace(/\D/g, "");
  const nombre = c.nombre.split(" ")[0];
  const asunto = c.experiencia ? `sobre ${c.experiencia.titulo}` : "para tu viaje";
  const acciones = [
    digitos.length >= 8 && {
      t: "WhatsApp",
      href: `https://wa.me/${digitos}?text=${encodeURIComponent(`Hola ${nombre}, te escribo de Traveloz Collection por tu consulta ${c.numeroTexto} ${asunto}.`)}`,
      Icono: MessageCircle,
    },
    digitos.length >= 6 && { t: "Llamar", href: `tel:+${digitos}`, Icono: Phone },
    {
      t: "Email",
      href: `mailto:${c.email}?subject=${encodeURIComponent(`Tu consulta ${c.numeroTexto} en Traveloz Collection`)}`,
      Icono: Mail,
    },
  ].filter((a): a is { t: string; href: string; Icono: typeof Mail } => !!a);
  const crm = crmDe(c.crmEstado);
  const linea = [
    { t: "Llegó la consulta", f: c.createdAt as Date | null, ok: true },
    { t: c.avisoEnviado ? "Aviso al equipo enviado" : "El aviso al equipo no salió", f: null, ok: c.avisoEnviado },
    { t: c.confirmacionEnviada ? "Confirmación al viajero enviada" : "La confirmación al viajero no salió", f: null, ok: c.confirmacionEnviada },
    ...(c.crmEnviadoEn ? [{ t: "Negocio en Bitrix", f: c.crmEnviadoEn as Date | null, ok: true }] : []),
  ];

  return (
    <div className="flex flex-col pb-10">
      <div className="flex flex-col gap-5 px-5 py-6 sm:px-6">
        <div role="radiogroup" aria-label="Estado de la consulta" className="grid grid-cols-2 overflow-hidden rounded-col-sm border border-col-ink/25 sm:grid-cols-4">
          {(Object.keys(ESTADOS) as Estado[]).map((e) => (
            <button
              key={e}
              type="button"
              role="radio"
              aria-checked={c.estado === e}
              onClick={() => onEstado(e)}
              className={cn(
                "h-10 border-col-ink/15 text-col-md font-medium transition-colors duration-col ease-col [&:not(:first-child)]:border-l max-sm:[&:nth-child(3)]:border-l-0 max-sm:[&:nth-child(n+3)]:border-t",
                c.estado === e ? "bg-col-ink text-col-base" : "bg-col-surface text-col-slate hover:text-col-ink",
              )}
            >
              {ESTADOS[e].label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {acciones.map(({ t, href, Icono }) => (
            <a
              key={t}
              href={href}
              target={t === "WhatsApp" ? "_blank" : undefined}
              rel={t === "WhatsApp" ? "noopener noreferrer" : undefined}
              className={boton({ variante: "secundario", tam: "sm" })}
            >
              <Icono aria-hidden className="h-4 w-4" strokeWidth={1.5} />
              {t}
            </a>
          ))}
        </div>
        <p className="text-col-sm text-col-slate">
          Prefiere {canalLegible(c.canal)} · llegó {haceTiempo(new Date(c.createdAt).getTime())}
          {c.especialista ? ` · para ${c.especialista.nombre}` : ""}
        </p>
      </div>

      <Grupo titulo="Viaje">
        <Datos
          filas={[
            {
              t: "Origen",
              v: c.experiencia ? (
                <span className="flex flex-col gap-1">
                  <span className="font-col-display text-col-xl leading-tight">{c.experiencia.titulo}</span>
                  <span className="flex flex-wrap gap-x-4 gap-y-1 text-col-sm font-medium">
                    <Link href={`/backend/collection/experiencias/${c.experiencia.id}`} className="text-col-slate underline decoration-col-gold/60 underline-offset-4 hover:text-col-ink">
                      Abrir en el constructor
                    </Link>
                    {c.experiencia.slug && (
                      <a
                        href={urlAbsoluta(rutaSitio.experiencia(c.experiencia.slug))}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-col-slate underline decoration-col-gold/60 underline-offset-4 hover:text-col-ink"
                      >
                        Ver en el sitio
                      </a>
                    )}
                  </span>
                </span>
              ) : (
                "Formulario de Contactanos"
              ),
            },
            { t: "Ocasión", v: c.ocasion },
            { t: "Destinos", v: c.destinos.join(", ") },
            { t: "Estilo", v: c.estilo },
            { t: "Inversión", v: c.inversion },
          ]}
        />
      </Grupo>

      <Grupo titulo="Fechas y viajeros">
        <Datos
          filas={[
            { t: "Fechas", v: textoFechas(c) || "Sin fechas todavía" },
            { t: "Viajeros", v: textoViajeros(c) },
          ]}
        />
      </Grupo>

      <Grupo titulo="Contacto">
        <Datos
          filas={[
            { t: "Email", v: c.email },
            { t: "Teléfono", v: tel },
            { t: "Canal", v: canalLegible(c.canal) },
            { t: "Novedades", v: c.aceptaNovedades ? "Acepta recibir novedades" : "No" },
          ]}
        />
      </Grupo>

      {c.comentarios && (
        <Grupo titulo="Comentarios">
          <blockquote className="border-l-2 border-col-gold pl-4 font-col-display text-col-xl leading-snug text-col-ink">{c.comentarios}</blockquote>
        </Grupo>
      )}

      <Grupo titulo="De dónde vino">
        <Datos
          filas={[
            { t: "Pauta", v: c.pauta || "Sin datos de campaña" },
            {
              t: "Página",
              v: c.origenUrl ? (
                <a href={c.origenUrl} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-1 text-col-ink underline decoration-col-line underline-offset-4 hover:decoration-col-gold">
                  <span className="truncate">{c.origenUrl.replace(/^https?:\/\//, "")}</span>
                  <ArrowUpRight aria-hidden className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                </a>
              ) : (
                ""
              ),
            },
          ]}
        />
      </Grupo>

      <Grupo titulo="Nota interna">
        <label htmlFor="consulta-nota" className="sr-only">
          Nota interna
        </label>
        <textarea
          id="consulta-nota"
          rows={4}
          maxLength={4000}
          value={nota}
          onChange={(e) => onNota(e.target.value)}
          placeholder="Lo que el equipo tiene que saber de esta consulta. Se guarda sola."
          className={cn(entradaArea, "min-h-[120px] resize-y")}
        />
      </Grupo>

      <Grupo titulo="Bitrix">
        <div className="flex items-center gap-2.5">
          <span aria-hidden className={cn("h-2.5 w-2.5 rounded-full", crm.punto)} />
          <span className="text-col-cuerpo text-col-ink">{crm.texto}</span>
        </div>
        <Datos
          filas={[
            { t: "Negocio", v: c.crmDealId ? `#${c.crmDealId}` : "" },
            { t: "Modo", v: c.crmModo === "comentario" ? "Sumada a un negocio abierto (24 h)" : c.crmModo === "nuevo" ? "Negocio nuevo" : c.crmModo ?? "" },
            { t: "Enviada", v: c.crmEnviadoEn ? fmtFechaHora(c.crmEnviadoEn) : "" },
            { t: "Intentos", v: c.crmIntentos ? String(c.crmIntentos) : "" },
          ]}
        />
        {c.crmError && (
          <p className="rounded-col-sm border border-col-alerta/30 bg-col-alerta/5 px-3 py-2.5 font-mono text-col-xs leading-relaxed text-col-alerta">{c.crmError}</p>
        )}
        {(c.crmEstado === "ERROR" || c.crmEstado === null) && (
          <Boton tam="sm" onClick={onReintentar} disabled={reintentando} className="self-start">
            {reintentando ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.5} />}
            Reintentar envío a Bitrix
          </Boton>
        )}
      </Grupo>

      <Grupo titulo="Recorrido">
        <ol className="flex flex-col gap-3">
          {linea.map((l) => (
            <li key={l.t} className="grid grid-cols-[14px_minmax(0,1fr)_auto] items-center gap-3 text-col-md">
              <span aria-hidden className={cn("h-2 w-2 rounded-full", l.ok ? "bg-col-gold" : "border border-col-slate/50")} />
              <span className={l.ok ? "text-col-ink" : "text-col-slate"}>{l.t}</span>
              {l.f && <span className="text-col-xs tabular-nums text-col-slate">{fmtFechaHora(l.f)}</span>}
            </li>
          ))}
        </ol>
      </Grupo>
    </div>
  );
}

// ── Newsletter ──────────────────────────────────────────────────────────────

type FiltroSuscriptor = "TODOS" | "CONFIRMADO" | "PENDIENTE" | "BAJA";
const FILTROS_SUSCRIPTOR: OpcionFiltro<FiltroSuscriptor>[] = [
  { id: "TODOS", label: "Todos" },
  { id: "CONFIRMADO", label: "Confirmados" },
  { id: "PENDIENTE", label: "Sin confirmar" },
  { id: "BAJA", label: "Bajas" },
];
const ESTADO_SUSCRIPTOR: Record<string, { label: string; tono: TonoEstado }> = {
  CONFIRMADO: { label: "Confirmado", tono: "ok" },
  PENDIENTE: { label: "Sin confirmar", tono: "aviso" },
  BAJA: { label: "Baja", tono: "neutro" },
};

/** "newsletter /nosotros" → "Newsletter · Nosotros"; la raíz es el inicio. */
function origenLegible(o: string) {
  if (o.startsWith("consulta")) return "Desde una consulta";
  const ultimo = o.replace(/^newsletter\s*/, "").split(/[/?#]/).filter(Boolean)[0] ?? "";
  if (!ultimo) return "Newsletter · Inicio";
  const t = decodeURIComponent(ultimo).replace(/-/g, " ");
  return `Newsletter · ${t.charAt(0).toUpperCase()}${t.slice(1)}`;
}

function Newsletter({ api }: { api: ApiConsultas }) {
  const avisar = useAviso();
  const [filtro, setFiltro] = useState<FiltroSuscriptor>("TODOS");
  const [items, setItems] = useState<Suscriptor[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    let vivo = true;
    setItems(null);
    void api
      .listarSuscriptores(filtro === "TODOS" ? undefined : { estado: filtro })
      .catch(() => ({ ok: false as const, error: "Sin conexión. Probá de nuevo." }))
      .then((r) => {
        if (!vivo) return;
        if (r.ok) {
          setItems(r.data);
          setError(null);
        } else {
          setItems([]);
          setError(r.error);
        }
      });
    return () => {
      vivo = false;
    };
  }, [api, filtro]);

  const exportar = async () => {
    setExportando(true);
    const r = await api.exportarCsv().catch(() => ({ ok: false as const, error: "Sin conexión. Probá de nuevo." }));
    setExportando(false);
    if (!r.ok) return avisar(r.error, "error");
    // BOM para que Excel lea bien los acentos.
    const url = URL.createObjectURL(new Blob(["﻿", r.data], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `suscriptores-collection-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    avisar("Listo: se descargó el CSV con los confirmados.");
  };

  return (
    <>
      <div className={barraHerramientas}>
        <Filtros etiqueta="Estado" opciones={FILTROS_SUSCRIPTOR} valor={filtro} onChange={setFiltro} />
        <Boton variante="secundario" onClick={() => void exportar()} disabled={exportando} className="ml-auto">
          {exportando ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" strokeWidth={1.5} />}
          Exportar CSV
        </Boton>
      </div>
      <p className="-mt-6 mb-8 text-col-sm text-col-slate">El CSV lleva solo a quienes confirmaron desde el mail (doble confirmación).</p>
      {error && (
        <p role="alert" className="mb-6 text-col-md text-col-alerta">
          {error}
        </p>
      )}
      {items === null ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="border-t border-col-line py-12 text-col-cuerpo text-col-slate">
          {filtro === "TODOS" ? "Todavía nadie se suscribió." : "Nadie en este estado."}
        </p>
      ) : (
        <ul className="flex flex-col border-t border-col-line">
          {items.map((s) => {
            const e = ESTADO_SUSCRIPTOR[s.estado] ?? ESTADO_SUSCRIPTOR.BAJA;
            return (
              <li
                key={s.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 border-b border-col-line px-2 py-3.5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_140px_130px] lg:px-4"
              >
                <span className="min-w-0 truncate text-col-cuerpo text-col-ink">{s.email}</span>
                <span className="col-start-1 min-w-0 truncate text-col-sm text-col-slate lg:col-start-2 lg:row-start-1">
                  {origenLegible(s.origen)}
                </span>
                <span className="col-start-1 text-col-xs text-col-slate lg:col-start-3 lg:row-start-1">
                  {s.estado === "BAJA"
                    ? "Se dio de baja"
                    : s.confirmadoEn
                      ? `Confirmó ${haceTiempo(s.confirmadoEn)}`
                      : `Se anotó ${haceTiempo(s.createdAt)}`}
                </span>
                <span className="col-start-2 row-span-3 row-start-1 self-start lg:col-start-4 lg:row-span-1 lg:self-center">
                  <Estado tono={e.tono}>{e.label}</Estado>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
