"use client";

// Ajustes de Collection: contacto, Bitrix, redes, pie y SEO global. Se guarda
// con un botón explícito (la barra aparece cuando hay cambios). La indexación
// no se toca acá: la decide una variable de entorno (COLLECTION_INDEXAR), y al
// cliente solo le contamos si el sitio aparece o no en Google.

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ImagePlus, LoaderCircle, X } from "lucide-react";
import type { AjustesCollection } from "@/lib/collection/ajustes";
import type { MedioVista } from "@/lib/collection/experiencia/contenido";
import { guardarAjustesCollection } from "@/actions/collection/ajustes.actions";
import { cn } from "@/components/lib/cn";
import { useCollection } from "../shell/contexto";
import { useAviso } from "../shell/Avisos";
import { useApi } from "../constructor/api";
import { SelectorMedios } from "../pickers/SelectorMedios";
import { MedioImagen } from "../sitio/medios";
import { Boton, EncabezadoPagina, Estado, Selector, etiquetaCampo, entrada, entradaArea } from "../ui";

const EASE = [0.22, 1, 0.36, 1] as const;
const E164 = /^\+\d{8,15}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2 }$/;

function Tarjeta({ titulo, texto, children, className }: { titulo: string; texto?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("flex min-w-0 flex-col gap-7 rounded-col-sm border border-col-line bg-col-surface p-6 md:p-8", className)}>
      <div className="flex flex-col gap-2">
        <h2 className="font-col-display text-col-2xl font-normal leading-tight text-col-ink">{titulo}</h2>
        {texto && <p className="max-w-[60ch] text-col-md leading-relaxed text-col-slate">{texto}</p>}
      </div>
      {children}
    </section>
  );
}

function Campo({
  id,
  label,
  ayuda,
  error,
  contador,
  children }: {
  id: string;
  label: string;
  ayuda?: React.ReactNode;
  error?: string | null;
  contador?: { n: number; ideal: number };
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={id} className={etiquetaCampo}>
          {label}
        </label>
        {contador && (
          <span className={cn("text-col-xs tabular-nums", contador.n > contador.ideal ? "text-col-aviso" : "text-col-muted")}>
            {contador.n} / {contador.ideal}
          </span>
        )}
      </div>
      {children}
      {error ? (
        <p role="alert" className="text-col-sm text-col-alerta">
          {error}
        </p>
      ) : (
        ayuda && <p className="text-col-sm leading-relaxed text-col-slate">{ayuda}</p>
      )}
    </div>
  );
}

export function Ajustes({
  inicial,
  origenes,
  indexa,
  guardar = guardarAjustesCollection }: {
  inicial: AjustesCollection;
  /** Orígenes de Bitrix; null si no se pudieron leer (se edita el id a mano). */
  origenes: { id: string; nombre: string }[] | null;
  /** process.env.COLLECTION_INDEXAR === "1", leído en el servidor. */
  indexa: boolean;
  guardar?: typeof guardarAjustesCollection;
}) {
  const { puede } = useCollection();
  const avisar = useAviso();
  const editable = puede("sitio.editar");
  const [base, setBase] = useState(inicial);
  const [a, setA] = useState(inicial);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sucio = (Object.keys(a) as (keyof AjustesCollection)[]).some((k) => a[k] !== base[k]);
  const cambiar = (p: Partial<AjustesCollection>) => setA((x) => ({ ...x, ...p }));

  const errWa = a.whatsapp && !E164.test(a.whatsapp) ? "Va con + y el código de país, sin espacios: +59899123456." : null;
  const emails = a.emailsConsultas.split(",").map((e) => e.trim()).filter(Boolean);

  // Aviso del navegador si se va con cambios sin guardar.
  useEffect(() => {
    if (!sucio) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [sucio]);

  const onGuardar = async () => {
    if (errWa) return setError(errWa);
    setGuardando(true);
    setError(null);
    const r = await guardar({ ...a, indexar: base.indexar }).catch(() => ({ ok: false as const, error: "Sin conexión. Probá de nuevo." }));
    setGuardando(false);
    if (!r.ok) return setError(r.error);
    setBase(r.data);
    setA(r.data);
    avisar("Ajustes guardados. El sitio los toma en unos minutos.");
  };

  return (
    <div className="mx-auto max-w-[1280px] pb-24">
      <EncabezadoPagina
        titulo="Ajustes"
        descripcion={editable ? "Datos de contacto, Bitrix, redes y cómo aparece el sitio en Google." : "Estás viendo los ajustes en modo lectura: tu usuario no tiene permiso para editar el sitio."}
      />

      <fieldset disabled={!editable} className="grid min-w-0 items-start gap-6 xl:grid-cols-2">
        <Tarjeta titulo="Contacto" texto="Lo que se ve en el sitio y adónde llegan los avisos de cada consulta.">
          <Campo
            id="aj-whatsapp"
            label="WhatsApp"
            error={errWa}
            ayuda={
              a.whatsapp && E164.test(a.whatsapp) ? (
                <>
                  El botón flotante abre{" "}
                  <a href={`https://wa.me/${a.whatsapp.slice(1)}`} target="_blank" rel="noopener noreferrer" className="text-col-ink underline decoration-col-gold/60 underline-offset-4">
                    wa.me/{a.whatsapp.slice(1)}
                  </a>
                </>
              ) : (
                "Vacío, el sitio no muestra el botón de WhatsApp."
              )
            }
          >
            <input
              id="aj-whatsapp"
              inputMode="tel"
              value={a.whatsapp}
              onChange={(e) => cambiar({ whatsapp: e.target.value.replace(/[^\d+]/g, "") })}
              placeholder="Ej.: +59899123456"
              className={entrada}
            />
          </Campo>
          <Campo id="aj-horario" label="Horario de atención" ayuda="Va en el pie del sitio y en el mail que recibe el viajero.">
            <input
              id="aj-horario"
              value={a.horario}
              maxLength={120}
              onChange={(e) => cambiar({ horario: e.target.value })}
              placeholder="Ej.: Lunes a viernes de 9 a 18"
              className={entrada}
            />
          </Campo>
          <ChipsEmails valores={emails} onChange={(v) => cambiar({ emailsConsultas: v.join(", ") })} editable={editable} />
        </Tarjeta>

        <Tarjeta
          titulo="Bitrix"
          texto={
            <>
              Cada consulta crea un negocio igual que los formularios del sitio de Traveloz: mismo embudo y etapa, con{" "}
              <span className="text-col-ink">Collection · &lt;experiencia&gt;</span> en Información del origen.
            </>
          }
        >
          <Campo id="aj-origen" label="Origen (SOURCE_ID)" ayuda="Si lo dejás por defecto, entra como Web.">
            {origenes ? (
              <Selector
                id="aj-origen"
                valor={a.bitrixOrigen}
                onCambio={(v) => cambiar({ bitrixOrigen: v })}
                deshabilitado={!editable}
                opciones={[
                  { valor: "", label: "Por defecto (Web)" },
                  ...origenes.map((o) => ({ valor: o.id, label: o.nombre })),
                  ...(a.bitrixOrigen && !origenes.some((o) => o.id === a.bitrixOrigen) ? [{ valor: a.bitrixOrigen, label: a.bitrixOrigen }] : []),
                ]}
              />
            ) : (
              <input
                id="aj-origen"
                value={a.bitrixOrigen}
                maxLength={60}
                onChange={(e) => cambiar({ bitrixOrigen: e.target.value.trim() })}
                placeholder="Vacío = por defecto (Web)"
                className={entrada}
              />
            )}
          </Campo>
          {!origenes && <p className="-mt-3 text-col-sm text-col-slate">No pudimos leer la lista de orígenes de Bitrix. Escribí el id a mano o dejalo vacío.</p>}
        </Tarjeta>

        <Tarjeta titulo="Redes" texto="Links completos. Las vacías no aparecen en el pie.">
          {(
            [
              ["instagram", "Instagram", "https://www.instagram.com/travelozcollection"],
              ["facebook", "Facebook", "https://www.facebook.com/travelozcollection"],
              ["linkedin", "LinkedIn", "https://www.linkedin.com/company/traveloz"],
            ] as const
          ).map(([k, label, ej]) => (
            <Campo key={k} id={`aj-${k}`} label={label} error={a[k] && !/^https?:\/\//.test(a[k]) ? "Tiene que empezar con https://" : null}>
              <input id={`aj-${k}`} type="url" value={a[k]} maxLength={300} onChange={(e) => cambiar({ [k]: e.target.value.trim() })} placeholder={`Ej.: ${ej}`} className={entrada} />
            </Campo>
          ))}
        </Tarjeta>

        <Tarjeta titulo="Pie del sitio" texto="La frase que acompaña la marca abajo de todo. Vacía, va la de siempre.">
          <Campo id="aj-footer" label="Texto" contador={{ n: a.textoFooter.length, ideal: 120 }}>
            <textarea
              id="aj-footer"
              rows={3}
              maxLength={600}
              value={a.textoFooter}
              onChange={(e) => cambiar({ textoFooter: e.target.value })}
              placeholder="Ej.: Viajes de autor, diseñados a tu medida por un especialista."
              className={entradaArea}
            />
          </Campo>
        </Tarjeta>

        <Tarjeta titulo="Google y redes sociales" texto="Lo que se usa cuando una página no tiene su propio título, descripción o imagen." className="xl:col-span-2">
          <div className="grid min-w-0 gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="flex min-w-0 flex-col gap-7">
              <Campo id="aj-seo-titulo" label="Título" contador={{ n: a.seoTitulo.length, ideal: 60 }}>
                <input id="aj-seo-titulo" value={a.seoTitulo} maxLength={120} onChange={(e) => cambiar({ seoTitulo: e.target.value })} placeholder="Ej.: Traveloz Collection" className={entrada} />
              </Campo>
              <Campo id="aj-seo-desc" label="Descripción" contador={{ n: a.seoDescripcion.length, ideal: 160 }}>
                <textarea
                  id="aj-seo-desc"
                  rows={3}
                  maxLength={320}
                  value={a.seoDescripcion}
                  onChange={(e) => cambiar({ seoDescripcion: e.target.value })}
                  placeholder="Ej.: Viajes de autor diseñados por especialistas de Traveloz."
                  className={entradaArea}
                />
              </Campo>
              <ImagenSeo id={a.seoImagenId} onChange={(id) => cambiar({ seoImagenId: id })} editable={editable} />
            </div>
            <div className="flex min-w-0 flex-col gap-3">
              <span className={etiquetaCampo}>Así se ve en Google</span>
              <div className="min-w-0 rounded-col-sm border border-col-line bg-white p-5 font-[arial,sans-serif]">
                <p className="truncate text-col-xs text-[#4d5156]">https://collection.traveloz.com.uy</p>
                <p className="mt-1 truncate text-col-xl leading-snug text-[#1a0dab]">{a.seoTitulo || "Traveloz Collection"}</p>
                <p className={cn("mt-1 line-clamp-2 text-col-md leading-[1.58]", a.seoDescripcion ? "text-[#4d5156]" : "italic text-[#9aa0a6]")}>
                  {a.seoDescripcion || "Sin descripción: Google va a elegir un pedazo de la página."}
                </p>
              </div>
            </div>
          </div>
        </Tarjeta>

        <Tarjeta titulo="Google" className="xl:col-span-2">
          <div className="flex flex-wrap items-center gap-4">
            <Estado tono={indexa ? "ok" : "neutro"}>{indexa ? "Visible en Google" : "Todavía no aparece"}</Estado>
            <p className="max-w-[70ch] text-col-cuerpo text-col-ink">
              {indexa
                ? "Google ya puede mostrar el sitio en sus resultados."
                : "El sitio todavía no aparece en Google. Se activa el día del lanzamiento."}
            </p>
          </div>
        </Tarjeta>
      </fieldset>

      <AnimatePresence>
        {editable && (sucio || error) && (
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="sticky bottom-4 z-20 mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-col-sm bg-col-noche px-5 py-4 text-white shadow-col-3"
          >
            <p className={cn("min-w-0 flex-1 text-col-md", error ? "text-[#F2B8A8]" : "text-white/80")} role={error ? "alert" : undefined}>
              {error ?? "Hay cambios sin guardar."}
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setA(base);
                  setError(null);
                }}
                className="h-10 px-3 text-col-sm font-medium text-white/70 transition-colors duration-col ease-col hover:text-white"
              >
                Descartar
              </button>
              <Boton onClick={() => void onGuardar()} disabled={guardando || !sucio} className="bg-col-gold text-col-noche hover:bg-white">
                {guardando && <LoaderCircle className="h-4 w-4 animate-spin" />}
                Guardar
              </Boton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ChipsEmails({ valores, onChange, editable }: { valores: string[]; onChange: (v: string[]) => void; editable: boolean }) {
  const [texto, setTexto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const sumar = () => {
    const nuevos = texto.split(/[,\s;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean);
    if (!nuevos.length) return;
    const malo = nuevos.find((e) => !EMAIL.test(e));
    if (malo) return setError(`“${malo}” no parece un email.`);
    onChange(Array.from(new Set([...valores, ...nuevos])));
    setTexto("");
    setError(null);
  };
  return (
    <Campo id="aj-emails" label="Emails para avisos de consultas" error={error} ayuda="Además del especialista de la experiencia. Enter o coma para sumar.">
      {valores.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {valores.map((e) => (
            <li key={e} className="flex h-8 max-w-full items-center gap-1.5 rounded-col-sm border border-col-line bg-col-base pl-3 pr-1 text-col-sm text-col-ink">
              <span className="truncate">{e}</span>
              {editable && (
                <button
                  type="button"
                  aria-label={`Quitar ${e}`}
                  onClick={() => onChange(valores.filter((x) => x !== e))}
                  className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-col-sm text-col-slate before:absolute before:-inset-2 before:content-[''] hover:text-col-alerta"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={1.5} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <input
        id="aj-emails"
        type="email"
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          setError(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            sumar();
          }
        }}
        onBlur={sumar}
        placeholder="Ej.: consultas@traveloz.com.uy"
        className={entrada}
      />
    </Campo>
  );
}

function ImagenSeo({ id, onChange, editable }: { id: string; onChange: (id: string) => void; editable: boolean }) {
  const api = useApi();
  const [medio, setMedio] = useState<MedioVista | null>(null);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    if (!id) return setMedio(null);
    if (medio?.id === id) return;
    let vivo = true;
    void api.obtenerMediosVista([id]).then((r) => vivo && r.ok && setMedio(r.data[0] ?? null));
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, api]);

  return (
    <div className="flex flex-col gap-2">
      <span className={etiquetaCampo}>Imagen para compartir</span>
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={() => setAbierto(true)}
          disabled={!editable}
          className="group relative aspect-[1200/630] w-[220px] max-w-full overflow-hidden rounded-col-sm border border-dashed border-col-slate/40 bg-col-base text-col-slate transition-colors duration-col ease-col hover:border-col-ink disabled:cursor-default"
        >
          {medio ? (
            <MedioImagen medio={medio} relleno sizes="220px" />
          ) : (
            <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-col-sm font-medium">
              <ImagePlus className="h-5 w-5" strokeWidth={1.25} aria-hidden />
              Elegir imagen
            </span>
          )}
        </button>
        {id && editable && (
          <span className="flex gap-1">
            <Boton variante="fantasma" tam="sm" onClick={() => setAbierto(true)}>
              Cambiar
            </Boton>
            <Boton variante="fantasma" tam="sm" onClick={() => onChange("")} className="hover:text-col-error">
              Quitar
            </Boton>
          </span>
        )}
      </div>
      <p className="text-col-sm text-col-slate">Horizontal, idealmente 1200 × 630.</p>
      <SelectorMedios
        abierto={abierto}
        onCerrar={() => setAbierto(false)}
        tipo="FOTO"
        titulo="Imagen para compartir"
        onElegir={(ms) => {
          const m = ms[0];
          if (m) {
            setMedio(m);
            onChange(m.id);
          }
          setAbierto(false);
        }}
      />
    </div>
  );
}
