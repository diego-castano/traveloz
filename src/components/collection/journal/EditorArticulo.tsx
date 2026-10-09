"use client";

// Editor de un artículo del journal: índice a la izquierda (lleva a cada
// parte y marca lo completo), un solo formulario largo al centro y la vista
// previa del artículo a la derecha. Guarda solo; publicar es aparte.

import { useCallback, useDeferredValue, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Check, LoaderCircle, UserRound } from "lucide-react";
import { textoPlano, type MedioVista } from "@/lib/collection/experiencia/contenido";
import {
  minutosDeLectura,
  NOMBRE_TIPO_ARTICULO,
  TIPOS_ARTICULO,
  type ArticuloVista,
  type ContenidoArticulo,
} from "@/lib/collection/paginas/contenido";
import type { AccionArticulo, ArticuloDetalle, CamposArticulo } from "@/actions/collection/journal.actions";
import { cn } from "@/components/lib/cn";
import { useCollection } from "../shell/contexto";
import { useAviso } from "../shell/Avisos";
import { Boton, VerEnSitio } from "../ui";
import { rutaSitio } from "../sitio/tarjetas";
import { EditorTexto } from "../editor/EditorTexto";
import { apiReal, ApiProvider, type ApiConstructor } from "../constructor/api";
import { Campo, Contador, Grupo, MediosCtx, SlotMedio, TiraMedios, inputLinea } from "../constructor/campos";
import { IndicadorGuardado } from "../constructor/Constructor";
import { Elegidos, Segmentado } from "../constructor/Elegidos";
import { slugDe } from "../constructor/estado";
import { BannerConflicto, PanelPrevia } from "../constructor/marco";
import { useAutoguardado } from "../constructor/useAutoguardado";
import { VistaPrevia } from "../constructor/VistaPrevia";
import { MedioImagen } from "../sitio/medios";
import { ArticuloPagina } from "../sitio/journal/ArticuloPagina";
import { apiJournalReal, type ApiJournal, type EstadoArticulo } from "./api";
import { EstadoArticuloPill } from "./ListaArticulos";

const DOMINIO = "collection.traveloz.com.uy";
const corte = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

type SeccionId = "datos" | "cuerpo" | "galeria" | "relacionadas" | "google" | "publicar";
const SECCIONES: { id: SeccionId; titulo: string }[] = [
  { id: "datos", titulo: "Portada y datos" },
  { id: "cuerpo", titulo: "Cuerpo" },
  { id: "galeria", titulo: "Galería" },
  { id: "relacionadas", titulo: "Relacionadas" },
  { id: "google", titulo: "Google" },
  { id: "publicar", titulo: "Publicar" },
];

interface Borrador {
  campos: CamposArticulo;
  contenido: ContenidoArticulo;
}

/** Lo mismo que valida cambiarEstadoArticulo("publicar"). */
function requisitos(b: Borrador) {
  const c = b.campos;
  return [
    { id: "titulo", texto: "Título de al menos 4 caracteres", ok: c.titulo.trim().length >= 4, seccion: "datos" as const },
    { id: "slug", texto: "Dirección web", ok: !!c.slug, seccion: "datos" as const },
    { id: "portada", texto: "Portada", ok: !!c.portadaId, seccion: "datos" as const },
    { id: "cuerpo", texto: "Cuerpo de al menos 300 caracteres", ok: textoPlano(b.contenido.cuerpo).length >= 300, seccion: "cuerpo" as const },
    { id: "seoTitulo", texto: "Título para Google (10 caracteres o más)", ok: c.seoTitulo.trim().length >= 10, seccion: "google" as const },
    { id: "seoDescripcion", texto: "Descripción para Google (50 caracteres o más)", ok: c.seoDescripcion.trim().length >= 50, seccion: "google" as const },
  ];
}

export function EditorArticulo({
  detalle,
  api = apiJournalReal,
  apiMedios = apiReal,
  className,
}: {
  detalle: ArticuloDetalle;
  api?: ApiJournal;
  apiMedios?: ApiConstructor;
  className?: string;
}) {
  const { puede } = useCollection();
  const avisar = useAviso();
  const puedeEditar = puede("sitio.editar");

  const [estado, setEstado] = useState<{ borrador: Borrador; cambios: number }>({
    borrador: { campos: detalle.campos, contenido: detalle.contenido },
    cambios: 0,
  });
  const { campos: c, contenido } = estado.borrador;
  const setCampos = useCallback(
    (p: Partial<CamposArticulo>) =>
      setEstado((s) => ({ cambios: s.cambios + 1, borrador: { ...s.borrador, campos: { ...s.borrador.campos, ...p } } })),
    [],
  );
  const setContenido = useCallback(
    (p: Partial<ContenidoArticulo>) =>
      setEstado((s) => ({ cambios: s.cambios + 1, borrador: { ...s.borrador, contenido: { ...s.borrador.contenido, ...p } } })),
    [],
  );

  const [medios, setMedios] = useState(() => new Map(detalle.medios.map((m) => [m.id, m])));
  const agregarMedios = useCallback(
    (ms: MedioVista[]) =>
      setMedios((x) => {
        const n = new Map(x);
        ms.forEach((m) => n.set(m.id, m));
        return n;
      }),
    [],
  );

  const ultimaRevision = useRef(detalle.revision);
  const guardarCon = useCallback(
    async (input: { revision: number; borrador: Borrador }) => {
      const r = await api.guardar(detalle.id, { revision: input.revision, ...input.borrador });
      if (r.ok) ultimaRevision.current = r.data.revision;
      return r;
    },
    [api, detalle.id],
  );
  const { guardado, revision, guardarYa } = useAutoguardado({
    id: detalle.id,
    guardarCon,
    estado,
    revisionInicial: detalle.revision,
    activo: puedeEditar,
  });
  const conflicto = guardado.tipo === "conflicto";
  const editable = puedeEditar && !conflicto;

  const [estadoArt, setEstadoArt] = useState<EstadoArticulo>(detalle.estado);
  const [publicadoRevision, setPublicadoRevision] = useState(detalle.publicadoRevision);
  const [publicadoEn, setPublicadoEn] = useState(detalle.publicadoEn);
  const hayCambios =
    estadoArt === "PUBLICADO" && (revision !== publicadoRevision || guardado.tipo === "pendiente" || guardado.tipo === "guardando");

  // ── Índice ──
  const centro = useRef<HTMLDivElement>(null);
  const [activa, setActiva] = useState<SeccionId>("datos");
  const ir = (id: SeccionId) => {
    const el = centro.current?.querySelector<HTMLElement>(`#art-${id}`);
    centro.current?.scrollTo({ top: Math.max(0, (el?.offsetTop ?? 0) - 24), behavior: "smooth" });
  };
  const alScroll = () => {
    const s = centro.current;
    if (!s) return;
    let actual: SeccionId = "datos";
    for (const x of SECCIONES) {
      const el = s.querySelector<HTMLElement>(`#art-${x.id}`);
      if (el && el.offsetTop - s.scrollTop <= 160) actual = x.id;
    }
    if (s.scrollTop + s.clientHeight >= s.scrollHeight - 8) actual = "publicar";
    setActiva(actual);
  };
  const req = requisitos(estado.borrador);
  const completas: Record<SeccionId, boolean> = {
    datos: req.filter((r) => r.seccion === "datos").every((r) => r.ok) && !!c.autorId,
    cuerpo: req.find((r) => r.id === "cuerpo")!.ok,
    galeria: contenido.galeria.length > 0,
    relacionadas: c.experienciaIds.length > 0,
    google: req.filter((r) => r.seccion === "google").every((r) => r.ok),
    publicar: estadoArt === "PUBLICADO" && !hayCambios,
  };

  // ── Vista previa ──
  const diferido = useDeferredValue(estado.borrador);
  const mediosDiferidos = useDeferredValue(medios);
  const vista = useMemo<ArticuloVista>(() => {
    const k = diferido.campos;
    return {
      id: detalle.id,
      slug: k.slug,
      tipo: k.tipo,
      titulo: k.titulo,
      bajada: k.bajada,
      minutos: minutosDeLectura(diferido.contenido.cuerpo),
      portada: k.portadaId ? mediosDiferidos.get(k.portadaId) ?? null : null,
      publicadoEn,
      cuerpo: diferido.contenido.cuerpo,
      galeria: diferido.contenido.galeria.flatMap((r) => {
        const m = mediosDiferidos.get(r.medioId);
        return m ? [m] : [];
      }),
      autor: detalle.especialistas.find((e) => e.id === k.autorId) ?? null,
      experiencias: k.experienciaIds.flatMap((id) => detalle.experiencias.filter((e) => e.id === id)),
    };
  }, [diferido, mediosDiferidos, publicadoEn, detalle.id, detalle.especialistas, detalle.experiencias]);
  const actualizando = diferido !== estado.borrador;

  // ── Estado ──
  const [enCurso, setEnCurso] = useState<AccionArticulo | null>(null);
  const [errorEstado, setErrorEstado] = useState<string | null>(null);
  const [confirmarArchivo, setConfirmarArchivo] = useState(false);
  const listo = req.every((r) => r.ok);
  const hacer = async (accion: AccionArticulo) => {
    setErrorEstado(null);
    setEnCurso(accion);
    const ok = await guardarYa();
    const r = ok ? await api.cambiarEstado(detalle.id, accion).catch(() => null) : null;
    setEnCurso(null);
    setConfirmarArchivo(false);
    if (!r?.ok) {
      setErrorEstado(r?.error ?? "Primero hay que guardar los últimos cambios. Revisá la conexión y probá de nuevo.");
      return;
    }
    if (accion === "publicar") {
      setPublicadoRevision(ultimaRevision.current);
      setPublicadoEn((p) => p ?? new Date().toISOString());
    } else if (accion !== "volver-borrador") {
      setPublicadoRevision(null);
    }
    setEstadoArt(r.data.estado);
    avisar(
      {
        publicar: estadoArt === "PUBLICADO" ? "Cambios publicados." : "Artículo publicado.",
        despublicar: "El artículo salió del sitio.",
        archivar: "Artículo archivado.",
        "volver-borrador": "El artículo volvió a borrador.",
      }[accion],
    );
  };

  const cambiarTitulo = (titulo: string) => {
    const automatico = c.slug === "" || c.slug === slugDe(c.titulo);
    setCampos(automatico ? { titulo, slug: slugDe(titulo) } : { titulo });
  };
  const cuerpoChars = textoPlano(contenido.cuerpo).length;
  const minutos = minutosDeLectura(contenido.cuerpo);
  const ayudante = (texto: string, onClick: () => void, visible: boolean) =>
    editable && visible ? (
      <button
        type="button"
        onClick={onClick}
        className="text-[12px] uppercase tracking-[0.12em] text-col-slate underline decoration-col-gold underline-offset-4 hover:text-col-ink"
      >
        {texto}
      </button>
    ) : null;
  const seoTitulo = c.seoTitulo || c.titulo;
  const seoDesc = c.seoDescripcion || c.bajada;

  return (
    <ApiProvider value={apiMedios}>
      <MediosCtx.Provider value={{ medios, agregarMedios, editable }}>
        <div className={cn("flex min-h-0 bg-col-base lining-nums", className)}>
          {/* Índice */}
          <aside className="hidden w-[260px] shrink-0 flex-col border-r border-col-line bg-col-surface lg:flex">
            <div className="px-5 pb-5 pt-5">
              <Link
                href="/backend/collection/journal"
                className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.16em] text-col-slate transition-colors hover:text-col-ink"
              >
                <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden /> Journal
              </Link>
              <p className={cn("mt-4 line-clamp-3 font-col-display text-[24px] leading-[1.1] text-col-ink", !c.titulo.trim() && "italic text-col-slate/50")}>
                {c.titulo.trim() || "Sin título"}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <EstadoArticuloPill estado={estadoArt} />
                {hayCambios && <span className="text-[11px] text-[#B07A2A]">Cambios sin publicar</span>}
              </div>
            </div>
            <nav aria-label="Partes del artículo" className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
              <ol className="space-y-0.5">
                {SECCIONES.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => ir(s.id)}
                      aria-current={activa === s.id ? "location" : undefined}
                      className={cn(
                        "relative flex h-11 w-full items-center gap-3 rounded-sm px-3 text-left text-[14px] transition-colors duration-200 ease-col",
                        activa === s.id ? "bg-col-base text-col-ink" : "text-col-slate hover:bg-col-base/60 hover:text-col-ink",
                      )}
                    >
                      {activa === s.id && <span aria-hidden className="absolute inset-y-2 left-0 w-0.5 bg-col-gold" />}
                      <span
                        className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                          completas[s.id] ? "border-col-gold bg-col-gold text-col-ink" : "border-col-slate/30",
                        )}
                      >
                        {completas[s.id] && <Check className="h-3 w-3" strokeWidth={2.5} aria-hidden />}
                      </span>
                      <span className="truncate">{s.titulo}</span>
                      <span className="sr-only">{completas[s.id] ? ", completo" : ", incompleto"}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </nav>
            <div className="border-t border-col-line px-4 py-3">
              <IndicadorGuardado g={guardado} editable={puedeEditar} />
            </div>
          </aside>

          {/* Formulario */}
          <div className="flex min-w-0 flex-1 flex-col">
            <BannerConflicto visible={conflicto} />
            {!puedeEditar && (
              <p className="shrink-0 border-b border-col-line bg-col-surface px-6 py-2.5 text-[13px] text-col-slate">
                Estás viendo este artículo en modo lectura: tu usuario no tiene permiso para editar el sitio.
              </p>
            )}
            <div ref={centro} onScroll={alScroll} className="relative min-h-0 flex-1 overflow-y-auto">
              <fieldset disabled={!editable} className="m-0 mx-auto w-full min-w-0 max-w-[700px] border-0 px-5 pb-24 pt-10 md:px-10">
                <legend className="sr-only">Artículo</legend>

                <section id="art-datos" className="flex flex-col gap-10">
                  <Segmentado
                    etiqueta="Tipo de artículo"
                    valor={c.tipo}
                    opciones={TIPOS_ARTICULO.map((t) => [t, NOMBRE_TIPO_ARTICULO[t]] as const)}
                    onCambio={(tipo) => setCampos({ tipo })}
                    deshabilitado={!editable}
                  />
                  <Campo etiqueta="Título" htmlFor="art-titulo" accion={<Contador n={c.titulo.length} ideal={70} max={140} />}>
                    <textarea
                      id="art-titulo"
                      rows={1}
                      value={c.titulo}
                      maxLength={140}
                      onChange={(e) => cambiarTitulo(e.target.value.replace(/\n/g, " "))}
                      placeholder="Kioto en otoño: los templos que valen el madrugón"
                      className={cn(inputLinea, "resize-none py-3 font-col-display text-[36px] leading-[1.1] placeholder:italic [field-sizing:content] md:text-[42px]")}
                    />
                  </Campo>
                  <Campo etiqueta="Bajada" htmlFor="art-bajada" accion={<Contador n={c.bajada.length} ideal={140} max={240} />}>
                    <textarea
                      id="art-bajada"
                      rows={1}
                      value={c.bajada}
                      maxLength={240}
                      onChange={(e) => setCampos({ bajada: e.target.value })}
                      placeholder="Una línea que invite a leer."
                      className={cn(inputLinea, "resize-none text-[17px] leading-relaxed [field-sizing:content]")}
                    />
                  </Campo>
                  <Campo
                    etiqueta="Dirección web"
                    htmlFor="art-slug"
                    ayuda={
                      <>
                        {DOMINIO}/journal/<span className="text-col-ink">{c.slug || "…"}</span>
                      </>
                    }
                    accion={ayudante("Usar el título", () => setCampos({ slug: slugDe(c.titulo) }), !!c.titulo && c.slug !== slugDe(c.titulo))}
                  >
                    <input
                      id="art-slug"
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
                      placeholder="kioto-en-otono"
                      className={cn(inputLinea, "font-mono text-[14px]")}
                    />
                  </Campo>
                  <Campo etiqueta="Portada" ayuda="Horizontal, se ve ancha arriba del texto y en la tarjeta del journal.">
                    <SlotMedio
                      aspecto={3 / 2}
                      tipo="FOTO"
                      medioId={c.portadaId}
                      etiqueta="portada"
                      onCambio={(m) => setCampos({ portadaId: m?.id ?? null })}
                    />
                  </Campo>
                  <Campo etiqueta="Autor">
                    <div role="radiogroup" aria-label="Autor" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {detalle.especialistas.map((e) => {
                        const activo = e.id === c.autorId;
                        return (
                          <button
                            key={e.id}
                            type="button"
                            role="radio"
                            aria-checked={activo}
                            onClick={() => setCampos({ autorId: activo ? null : e.id })}
                            className={cn(
                              "flex items-center gap-3 rounded-sm border p-2.5 text-left transition-[border-color,background-color] duration-200 ease-col",
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
                      {!detalle.especialistas.length && <p className="text-[14px] italic text-col-slate">Todavía no hay especialistas cargados.</p>}
                    </div>
                  </Campo>
                </section>

                <div id="art-cuerpo" className="mt-14">
                  <Grupo titulo="Cuerpo" ayuda="Subtítulos, listas, citas y enlaces. La primera letra se hace capitular.">
                    <div className="-mt-2">
                      <EditorTexto
                        etiqueta="Cuerpo del artículo"
                        valor={contenido.cuerpo}
                        onCambio={(cuerpo) => setContenido({ cuerpo })}
                        minAlto={420}
                        maxAlto={900}
                        maximo={60000}
                        recomendado={300}
                        placeholder="Empezá por lo que viste o probaste. Después, lo práctico."
                        deshabilitado={!editable}
                      />
                      <p className="mt-3 flex items-center justify-between text-[12px] tabular-nums text-col-slate">
                        <span className={cn(cuerpoChars >= 300 && "text-[#B07A2A]")}>
                          {cuerpoChars} caracteres{cuerpoChars < 300 ? ` (mínimo 300 para publicar)` : ""}
                        </span>
                        <span aria-live="polite">{minutos} min de lectura</span>
                      </p>
                    </div>
                  </Grupo>
                </div>

                <div id="art-galeria" className="mt-14">
                  <Grupo titulo="Galería" ayuda="Fotos que acompañan el texto, al final del artículo.">
                    <TiraMedios refs={contenido.galeria} onCambio={(galeria) => setContenido({ galeria })} max={30} etiqueta="Galería del artículo" />
                  </Grupo>
                </div>

                <div id="art-relacionadas" className="mt-14">
                  <Grupo titulo="Experiencias relacionadas" ayuda="Hasta 6, al pie del artículo. Solo se pueden elegir experiencias publicadas.">
                    <Elegidos
                      ids={c.experienciaIds}
                      opciones={detalle.experiencias.map((e) => ({
                        id: e.id,
                        titulo: e.titulo,
                        detalle: e.destinos.join(", "),
                        medio: e.portada,
                      }))}
                      onCambio={(experienciaIds) => setCampos({ experienciaIds })}
                      max={6}
                      etiqueta="experiencias"
                      editable={editable}
                      vacio="Sin experiencias relacionadas."
                    />
                  </Grupo>
                </div>

                <div id="art-google" className="mt-14">
                  <Grupo titulo="Google">
                    <Campo
                      etiqueta="Título para Google"
                      htmlFor="art-seo-titulo"
                      ayuda={<Contador n={c.seoTitulo.length} ideal={60} max={70} />}
                      accion={ayudante("Usar título", () => setCampos({ seoTitulo: c.titulo.slice(0, 70) }), !!c.titulo && c.seoTitulo !== c.titulo)}
                    >
                      <input
                        id="art-seo-titulo"
                        value={c.seoTitulo}
                        maxLength={70}
                        onChange={(e) => setCampos({ seoTitulo: e.target.value })}
                        placeholder={c.titulo || "Kioto en otoño: los templos que valen el madrugón"}
                        className={cn(inputLinea, "text-[17px]")}
                      />
                    </Campo>
                    <Campo
                      etiqueta="Descripción para Google"
                      htmlFor="art-seo-desc"
                      ayuda={<Contador n={c.seoDescripcion.length} ideal={155} max={170} />}
                      accion={ayudante("Usar bajada", () => setCampos({ seoDescripcion: c.bajada.slice(0, 170) }), !!c.bajada && c.seoDescripcion !== c.bajada)}
                    >
                      <textarea
                        id="art-seo-desc"
                        rows={3}
                        value={c.seoDescripcion}
                        maxLength={170}
                        onChange={(e) => setCampos({ seoDescripcion: e.target.value })}
                        placeholder="Al menos 50 caracteres. De qué trata y por qué leerlo."
                        className={cn(inputLinea, "min-h-[4.5em] resize-none text-[15px] leading-relaxed [field-sizing:content]")}
                      />
                    </Campo>
                    <div className="rounded-sm border border-col-line bg-white p-5 font-[arial,sans-serif]">
                      <div className="flex items-center gap-3">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-col-ink font-col-display text-[15px] italic text-col-base">C</span>
                        <span className="min-w-0">
                          <span className="block text-[14px] leading-tight text-[#202124]">Traveloz Collection</span>
                          <span className="block truncate text-[12px] leading-tight text-[#4d5156]">
                            https://{DOMINIO} › journal › {c.slug || "…"}
                          </span>
                        </span>
                      </div>
                      <p className={cn("mt-2 text-[20px] leading-snug", seoTitulo ? "text-[#1a0dab]" : "italic text-[#9aa0a6]")}>
                        {seoTitulo ? corte(seoTitulo, 60) : "Sin título"}
                      </p>
                      <p className={cn("mt-1 text-[14px] leading-[1.58]", seoDesc ? "text-[#4d5156]" : "italic text-[#9aa0a6]")}>
                        {seoDesc ? corte(seoDesc, 155) : "Sin descripción: Google va a elegir un pedazo del artículo."}
                      </p>
                    </div>
                  </Grupo>
                </div>
              </fieldset>

              {/* Publicar: fuera del fieldset para que los botones respondan al permiso, no al bloqueo de edición */}
              <section id="art-publicar" className="mx-auto w-full max-w-[700px] px-5 pb-24 md:px-10">
                <div className="rounded-sm bg-col-ink p-6 text-col-base">
                  <div className="flex flex-wrap items-center gap-3">
                    <EstadoArticuloPill estado={estadoArt} className={estadoArt === "PUBLICADO" ? "border-col-gold" : undefined} />
                    {hayCambios && <span className="text-[13px] text-col-gold">Hay cambios sin publicar</span>}
                  </div>
                  <p className="mt-4 max-w-[52ch] font-col-display text-[24px] leading-snug">
                    {estadoArt === "BORRADOR"
                      ? "Solo lo ve el equipo. Cuando esté listo, publicalo."
                      : estadoArt === "PUBLICADO"
                        ? "Está en el journal del sitio."
                        : "Guardado fuera de la vista. No se borra nada."}
                  </p>
                  {estadoArt === "PUBLICADO" && c.slug && (
                    <VerEnSitio ruta={rutaSitio.articulo(c.slug)} className="mt-3 text-col-base/80 hover:text-col-base" />
                  )}
                  <ul className="mt-6 flex flex-col border-t border-col-base/10 pt-3">
                    {req.map((r) => (
                      <li key={r.id}>
                        <button
                          type="button"
                          onClick={() => ir(r.seccion)}
                          className="flex w-full items-center gap-3 rounded-sm px-1 py-2 text-left text-[14px] transition-colors hover:bg-col-base/5"
                        >
                          <span
                            className={cn(
                              "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                              r.ok ? "border-col-gold bg-col-gold text-col-ink" : "border-col-base/30",
                            )}
                          >
                            {r.ok && <Check className="h-3 w-3" strokeWidth={2.5} aria-hidden />}
                          </span>
                          <span className={r.ok ? "text-col-base/60" : "text-col-base"}>{r.texto}</span>
                          <span className="sr-only">{r.ok ? ", listo" : ", falta"}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  {puedeEditar && (
                    <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-col-base/10 pt-5">
                      {estadoArt !== "ARCHIVADO" && (
                        <Boton
                          tam="sm"
                          disabled={!listo || !!enCurso || conflicto || (estadoArt === "PUBLICADO" && !hayCambios)}
                          onClick={() => void hacer("publicar")}
                          className="bg-col-gold text-col-ink hover:bg-col-base"
                        >
                          {enCurso === "publicar" && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
                          {estadoArt === "PUBLICADO" ? "Publicar cambios" : "Publicar"}
                        </Boton>
                      )}
                      {estadoArt === "PUBLICADO" && (
                        <BotonClaro onClick={() => void hacer("despublicar")} disabled={!!enCurso}>
                          {enCurso === "despublicar" && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
                          Despublicar
                        </BotonClaro>
                      )}
                      {estadoArt === "ARCHIVADO" && (
                        <BotonClaro onClick={() => void hacer("volver-borrador")} disabled={!!enCurso}>
                          {enCurso === "volver-borrador" && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
                          Volver a borrador
                        </BotonClaro>
                      )}
                      {estadoArt !== "ARCHIVADO" &&
                        (confirmarArchivo ? (
                          <span className="ml-auto flex items-center gap-3 text-[13px] text-col-base/80">
                            ¿Archivarlo? Sale del sitio.
                            <button
                              type="button"
                              onClick={() => void hacer("archivar")}
                              disabled={!!enCurso}
                              className="text-[12px] uppercase tracking-[0.12em] text-[#E9A08F] underline underline-offset-4"
                            >
                              {enCurso === "archivar" ? "Archivando…" : "Sí, archivar"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmarArchivo(false)}
                              className="text-[12px] uppercase tracking-[0.12em] text-col-base/60 hover:text-col-base"
                            >
                              No
                            </button>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmarArchivo(true)}
                            className="ml-auto text-[12px] uppercase tracking-[0.12em] text-col-base/50 transition-colors hover:text-col-base"
                          >
                            Archivar
                          </button>
                        ))}
                    </div>
                  )}
                  {errorEstado && (
                    <p role="alert" className="mt-4 flex items-start gap-2 text-[14px] text-[#E9A08F]">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden /> {errorEstado}
                    </p>
                  )}
                </div>
              </section>
            </div>
          </div>

          <PanelPrevia
            clave="col.journal.previa"
            render={(k) => (
              <VistaPrevia {...k} titulo={c.titulo || "Artículo"} actualizando={actualizando}>
                <ArticuloPagina vista={vista} modo="preview" />
              </VistaPrevia>
            )}
          />
        </div>
      </MediosCtx.Provider>
    </ApiProvider>
  );
}

function BotonClaro(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <Boton
      tam="sm"
      {...props}
      className="border border-col-base/30 bg-transparent text-col-base hover:border-col-base hover:bg-transparent"
    />
  );
}
