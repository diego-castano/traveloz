"use client";

// Bloques de contenido propio de la página: portada, manifiesto, texto,
// imagen y texto, galería, cita, cifras, newsletter y cierre. En el sitio se
// omite cada pieza vacía; en la vista previa se ve su fantasma.

import { useState } from "react";
import dynamic from "next/dynamic";
import { Play } from "lucide-react";
import { boton, Eyebrow } from "@/components/collection/ui";
import { cn } from "@/components/lib/cn";
import { MedioFantasma, MedioImagen } from "../medios";
import { etiqueta, plural, vacioHtml } from "../experiencia/secciones";
import { useEnvios } from "../consulta/envios";
import {
  Cabecera,
  Enlace,
  fantasma,
  fantasmaOscuro,
  Html,
  MedioBloque,
  TITULO_FANTASMA,
  type PropsBloque,
} from "./comun";

const Visor = dynamic(() => import("../Visor"), { ssr: false });

// ── Portada ─────────────────────────────────────────────────────────────────

export function BloquePortada({ bloque: b, modo }: PropsBloque<"portada">) {
  const p = modo === "preview";
  return (
    <header className="cs-hero">
      <MedioBloque medio={b.medioVista} preview={p} relleno oscuro prioridad texto="Elegí la foto o el video de portada" className="pb-56" />
      <div className="cs-hero-velo" aria-hidden />
      <div className="cs-hero-texto cs-envolvente">
        {b.eyebrow && <Eyebrow className="text-white">{b.eyebrow}</Eyebrow>}
        {(b.titulo || p) && (
          <h1 className={cn("cs-display max-w-[20ch]", !b.titulo && fantasmaOscuro)}>{b.titulo || TITULO_FANTASMA}</h1>
        )}
        <div className="cs-hero-pie">
          {(b.bajada || p) && (
            <p className={cn("max-w-[46ch] text-[17px] font-light leading-[1.6] text-white/90", !b.bajada && fantasmaOscuro)}>
              {b.bajada || "Una línea que invite a seguir."}
            </p>
          )}
          <Enlace texto={b.ctaTexto} href={b.ctaHref} preview={p} claro />
        </div>
      </div>
    </header>
  );
}

// ── Manifiesto ──────────────────────────────────────────────────────────────

export function BloqueManifiesto({ bloque: b, modo }: PropsBloque<"manifiesto">) {
  const p = modo === "preview";
  const hay = !vacioHtml(b.texto);
  return (
    <div className="cs-bloque bg-col-surface">
      <div className="cs-envolvente flex flex-col items-center gap-8 text-center">
        {b.eyebrow && <span className={cn(etiqueta, "text-col-slate")}>{b.eyebrow}</span>}
        {hay ? (
          <div className="cs-manifiesto" dangerouslySetInnerHTML={{ __html: b.texto }} />
        ) : (
          p && <p className={cn("cs-manifiesto", fantasma)}>Un párrafo que diga quiénes son y cómo viajan.</p>
        )}
        <span aria-hidden className="h-px w-12 bg-col-gold" />
        {(b.firma || p) && (
          <p className={cn("max-w-[52ch] text-[18px] font-light leading-[1.6] text-col-slate", !b.firma && fantasma)}>
            {b.firma || "Firma o frase de cierre"}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Texto ───────────────────────────────────────────────────────────────────

export function BloqueTexto({ bloque: b, modo }: PropsBloque<"texto">) {
  const p = modo === "preview";
  const ancho = b.ancho === "ancho";
  const cuerpo = !vacioHtml(b.texto) ? (
    <Html html={b.texto} className="text-col-ink" />
  ) : (
    p && <p className={cn("text-[18px] leading-relaxed", fantasma)}>Escribí el texto: subtítulos, listas y enlaces.</p>
  );
  return (
    <div className="cs-bloque">
      <div className={cn("cs-envolvente", ancho && "cs-texto-ancho")}>
        <Cabecera
          eyebrow={b.eyebrow}
          titulo={b.titulo}
          preview={p}
          className={cn(ancho ? "cs-texto-ancho-cabecera" : "mx-auto mb-10 max-w-[680px]")}
        />
        <div className={cn(!ancho && "mx-auto max-w-[680px]", ancho && "max-w-[760px]")}>{cuerpo}</div>
      </div>
    </div>
  );
}

// ── Imagen y texto ──────────────────────────────────────────────────────────

export function BloqueImagenTexto({ bloque: b, modo }: PropsBloque<"imagenTexto">) {
  const p = modo === "preview";
  const conFoto = !!b.medioVista || p;
  return (
    <div className="cs-bloque">
      <div
        className={cn(
          "cs-envolvente cs-par",
          b.lado === "derecha" && "cs-par--derecha",
          !conFoto && "cs-par--solo",
        )}
      >
        {conFoto && (
          <MedioBloque medio={b.medioVista} preview={p} aspecto={4 / 5} sizes="(min-width: 768px) 50vw, 100vw" />
        )}
        <div className="flex flex-col gap-6">
          <Cabecera eyebrow={b.eyebrow} titulo={b.titulo} preview={p} />
          {!vacioHtml(b.texto) ? (
            <Html html={b.texto} className="max-w-[520px] text-col-slate" />
          ) : (
            p && <p className={cn("text-[18px]", fantasma)}>Contá la historia que acompaña a la foto.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Galería ─────────────────────────────────────────────────────────────────

const ASPECTOS_FANTASMA = [4 / 5, 3 / 2, 1, 3 / 4, 3 / 2, 4 / 5];

export function BloqueGaleria({ bloque: b, modo }: PropsBloque<"galeria">) {
  const p = modo === "preview";
  const [indice, setIndice] = useState(-1);
  const fotos = b.mediosVista;
  return (
    <div className="cs-bloque">
      <div className="cs-envolvente">
        {(b.titulo || p || fotos.length > 0) && (
          <div className="mb-12 flex items-end justify-between gap-6">
            {(b.titulo || p) && <h2 className={cn("cs-h2", !b.titulo && fantasma)}>{b.titulo || TITULO_FANTASMA}</h2>}
            {fotos.length > 0 && (
              <span className="ml-auto shrink-0 pb-2 text-[13px] text-col-slate">{plural(fotos.length, "foto", "fotos")}</span>
            )}
          </div>
        )}
        <div className="cs-galeria">
          {fotos.length
            ? fotos.map((m, i) => (
                <figure key={`${m.id}-${i}`} className="relative">
                  <button
                    type="button"
                    onClick={() => setIndice(i)}
                    aria-label={`Ver foto: ${m.leyendaUso || m.alt}`}
                    className="group relative block w-full cursor-zoom-in overflow-hidden"
                  >
                    <MedioImagen
                      medio={m}
                      sizes="(min-width: 768px) 33vw, 50vw"
                      imgClassName="transition-transform duration-[1200ms] ease-col group-hover:scale-[1.04]"
                    />
                    {m.tipo === "VIDEO" && (
                      <span className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-sm bg-col-ink/60 text-col-base">
                        <Play className="h-3.5 w-3.5" strokeWidth={1.5} />
                      </span>
                    )}
                  </button>
                  {(m.leyendaUso || m.credito) && (
                    <figcaption className="cs-galeria-leyenda pointer-events-none absolute bottom-3 left-3 max-w-[calc(100%-24px)] bg-col-base px-2.5 py-1.5 text-[12px] leading-4 text-col-ink">
                      {m.leyendaUso}
                      {m.credito && <span className="text-col-slate">{m.leyendaUso && " · "}Foto: {m.credito}</span>}
                    </figcaption>
                  )}
                </figure>
              ))
            : p && ASPECTOS_FANTASMA.map((a, i) => <MedioFantasma key={i} aspecto={a} texto={i === 0 ? "Sumá fotos de la biblioteca" : undefined} />)}
        </div>
      </div>
      {indice >= 0 && <Visor fotos={fotos} indice={indice} onCerrar={() => setIndice(-1)} />}
    </div>
  );
}

// ── Cita ────────────────────────────────────────────────────────────────────

export function BloqueCita({ bloque: b, modo }: PropsBloque<"cita">) {
  const p = modo === "preview";
  const conFoto = !!b.medioVista;
  const cita = (
    <figure className="cs-envolvente relative flex flex-col items-center gap-8 text-center">
      <blockquote className={cn("cs-frase max-w-[24ch]", !b.texto.trim() && (conFoto ? fantasmaOscuro : fantasma))}>
        {b.texto.trim() ? `“${b.texto.trim()}”` : "Una frase que valga la pena destacar."}
      </blockquote>
      {(b.autor || p) && (
        <figcaption className="flex items-center gap-4">
          <span aria-hidden className="h-px w-8 bg-col-gold" />
          <span className={cn(etiqueta, !b.autor && (conFoto ? "text-white/40" : "text-col-slate/40"))}>{b.autor || "Autor"}</span>
        </figcaption>
      )}
    </figure>
  );
  if (conFoto) {
    return (
      <div className="cs-cita-foto">
        <MedioBloque medio={b.medioVista} preview={p} relleno />
        <div aria-hidden className="absolute inset-0 bg-col-ink/50" />
        <div className="relative w-full py-24">{cita}</div>
      </div>
    );
  }
  return <div className="cs-bloque bg-col-surface">{cita}</div>;
}

// ── Cifras ──────────────────────────────────────────────────────────────────

export function BloqueCifras({ bloque: b, modo }: PropsBloque<"cifras">) {
  const p = modo === "preview";
  let items = b.items.filter((i) => p || i.valor.trim());
  if (!items.length && p) items = [1, 2, 3].map((n) => ({ id: `f${n}`, valor: "", etiqueta: "" }));
  return (
    <div className="cs-bloque">
      <div className="cs-envolvente flex flex-col gap-12">
        <Cabecera titulo={b.titulo} preview={p} />
        <dl className="cs-datos border-y border-col-line" style={{ "--cs-n": items.length } as React.CSSProperties}>
          {items.map((i) => (
            <div key={i.id} className="flex flex-col-reverse justify-end gap-3 px-5 py-8">
              <dt className={cn(etiqueta, "text-col-slate", !i.etiqueta && "text-col-slate/40")}>{i.etiqueta || "Etiqueta"}</dt>
              <dd className={cn("cs-dato", !i.valor.trim() && fantasma)}>{i.valor.trim() || "00"}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

// ── Newsletter ──────────────────────────────────────────────────────────────

export function BloqueNewsletter({ bloque: b, modo }: PropsBloque<"newsletter">) {
  const p = modo === "preview";
  return (
    <div className="cs-bloque">
      <div className="cs-envolvente">
        <div className="cs-newsletter">
          {b.medioVista && (
            <>
              <MedioImagen medio={b.medioVista} relleno sizes="100vw" />
              <div aria-hidden className="absolute inset-0 bg-col-ink/80" />
            </>
          )}
          <div className="relative flex flex-col gap-5">
            <h2 className={cn("cs-h2 text-col-base", !b.titulo && p && fantasmaOscuro)}>
              {b.titulo || (p ? TITULO_FANTASMA : "Cartas de viaje, pocas veces al año.")}
            </h2>
            {b.texto && <p className="max-w-[46ch] text-[17px] font-light leading-[1.6] text-col-line">{b.texto}</p>}
          </div>
          <FormNewsletter preview={p} />
        </div>
      </div>
    </div>
  );
}

/** Doble confirmación: acá solo se pide el mail; la suscripción vale con el clic. */
function FormNewsletter({ preview }: { preview: boolean }) {
  const { suscribir } = useEnvios();
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [estado, setEstado] = useState<"quieto" | "enviando" | "ok" | "error">("quieto");
  const [error, setError] = useState("");

  const enviar = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      setEstado("error");
      setError("Revisá el email: parece incompleto.");
      return;
    }
    setEstado("enviando");
    try {
      const r = await suscribir({ email, origen: `newsletter ${window.location.pathname}`.slice(0, 80), website });
      if (r.ok) return setEstado("ok");
      setEstado("error");
      setError(r.error);
    } catch {
      setEstado("error");
      setError("No pudimos conectarnos. Probá de nuevo en un momento.");
    }
  };

  if (estado === "ok") {
    return (
      <div role="status" className="relative flex flex-col gap-3 border-l-2 border-col-gold pl-5">
        <span className="font-col-display text-[26px] leading-tight text-col-base">Te mandamos un mail para confirmar</span>
        <span className="text-[15px] font-light leading-[1.6] text-col-line">
          Tocá el enlace del mail que llegó a {email.trim()} y quedás en la lista. Si no lo ves, mirá en promociones o spam.
        </span>
      </div>
    );
  }
  return (
    <form
      noValidate
      className="relative flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!preview && estado !== "enviando") void enviar();
      }}
    >
      <label className="flex flex-col gap-2">
        <span className={cn(etiqueta, "text-col-line")}>Email</span>
        <span className="cs-newsletter-campo">
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="tu@correo.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (estado === "error") setEstado("quieto");
            }}
            aria-invalid={estado === "error"}
            className="h-[52px] min-w-0 flex-1 border-0 border-b border-col-line bg-transparent px-0 text-[16px] text-col-base placeholder:text-col-line/50 transition-[border-color,box-shadow] duration-300 ease-col focus:border-col-gold focus:shadow-[0_1px_0_#F4B860] focus:outline-none focus:ring-0"
          />
          <button
            type="submit"
            disabled={estado === "enviando"}
            className={cn(boton(), "h-[52px] bg-col-base text-col-ink hover:bg-col-gold disabled:opacity-80")}
          >
            {estado === "enviando" ? "Enviando…" : "Suscribirme"}
          </button>
        </span>
      </label>
      <span aria-hidden className="sr-only">
        <input type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </span>
      {estado === "error" ? (
        <span role="alert" className="text-[14px] text-col-gold">
          {error}
        </span>
      ) : (
        <span className="text-[13px] text-col-line">Sin spam y con baja en un clic.</span>
      )}
    </form>
  );
}

// ── Cierre ──────────────────────────────────────────────────────────────────

export function BloqueCierre({ bloque: b, modo }: PropsBloque<"cierre">) {
  const p = modo === "preview";
  const conFoto = !!b.medioVista || p;
  const conCta = (b.ctaTexto.trim() && b.ctaHref.trim()) || p;
  return (
    <div className={cn("cs-cierre-par", !conFoto && "cs-cierre-par--solo")}>
      <div className="cs-cierre-par-texto flex flex-col justify-center gap-6">
        {b.eyebrow && <Eyebrow className="text-col-line">{b.eyebrow}</Eyebrow>}
        <h2 className={cn("cs-h2 max-w-[18ch] text-col-base", !b.titulo && fantasmaOscuro)}>{b.titulo || TITULO_FANTASMA}</h2>
        {(b.texto || p) && (
          <p className={cn("max-w-[46ch] text-[18px] font-light leading-[1.6] text-col-line", !b.texto && fantasmaOscuro)}>
            {b.texto || "Una invitación corta a escribirnos."}
          </p>
        )}
        {conCta &&
          (b.ctaTexto.trim() && b.ctaHref.trim() ? (
            <a href={b.ctaHref} className={cn(boton(), "mt-4 self-start bg-col-base text-col-ink hover:bg-col-gold")}>
              {b.ctaTexto}
            </a>
          ) : (
            <span className={cn(boton(), "mt-4 self-start border border-col-base/30 bg-transparent text-col-base/50 hover:bg-transparent")}>
              {b.ctaTexto || "Texto del botón"}
            </span>
          ))}
      </div>
      {conFoto && (
        <div className="cs-cierre-par-foto">
          <MedioBloque medio={b.medioVista} preview={p} relleno oscuro sizes="(min-width: 768px) 50vw, 100vw" />
        </div>
      )}
    </div>
  );
}
