"use client";

// Especialistas de Collection: grilla de retratos 4:5, orden arrastrando,
// interruptor de publicado y una hoja lateral con la franja "Tu especialista"
// tal cual sale en la página de experiencia.

import { forwardRef, useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { ImagePlus, RefreshCw, UserRound, X } from "lucide-react";
import {
  actualizarEspecialista,
  crearEspecialista,
  eliminarEspecialista,
  reordenarEspecialistas,
  type EspecialistaItem } from "@/actions/collection/especialistas.actions";
import type { Resultado } from "@/lib/collection/ejecutar";
import type { MedioVista } from "@/lib/collection/experiencia/contenido";
import { cn } from "@/components/lib/cn";
import { iniciales, useCollection } from "../shell/contexto";
import { useAviso, useDeshacer } from "../shell/Avisos";
import { EncabezadoPagina, Estado, Vacio, Eyebrow, Interruptor, tarjetaElevable, etiquetaCampo, entrada, entradaArea, entradaSelect, entradaTitulo } from "../ui";
import { MedioImagen, fondoDeColor } from "../sitio/medios";
import { Campo, ChipsTexto, Contador, claseLevantado, estiloOrden, useRefsUnidos, useSensoresOrden } from "../constructor/campos";
import { Numero, TRANSICION_SOLTAR, useEntradaLista } from "../movimiento";
import { EditorTexto } from "../editor/EditorTexto";
import { SelectorMedios } from "../pickers/SelectorMedios";
import { BotonEncuadre, useEditorEncuadre } from "../biblioteca/EditorEncuadre";
import type { Aspecto } from "@/lib/collection/recortes";
import { SoltarAqui } from "../biblioteca/ZonaSubida";
import { Especialista, PaginaCtx } from "../sitio/experiencia/secciones";
import { demoVacia } from "../sitio/demo";
import "../sitio/sitio.css";
import { AsaTarjeta, Escalado, Hoja, NuevoEnLinea, ZonaEliminar, reponer, tonoDe, useGuardadoDiferido } from "./comun";


type Payload = Parameters<typeof actualizarEspecialista>[1];

/** Lo que la pantalla le pide al servidor. La ruta de desarrollo pasa uno en memoria. */
export interface ApiEspecialistas {
  crear(input: { nombre: string }): Promise<Resultado<{ id: string }>>;
  actualizar(id: string, input: Payload): Promise<Resultado<null>>;
  reordenar(ids: string[]): Promise<Resultado<null>>;
  eliminar(id: string): Promise<Resultado<null>>;
}

const apiReal: ApiEspecialistas = {
  crear: crearEspecialista,
  actualizar: actualizarEspecialista,
  reordenar: reordenarEspecialistas,
  eliminar: eliminarEspecialista };

function payload(e: EspecialistaItem): Payload {
  return {
    nombre: e.nombre,
    userId: e.userId,
    region: e.region,
    frase: e.frase,
    bio: e.bio,
    idiomas: e.idiomas,
    retratoId: e.retrato?.id ?? null,
    whatsapp: e.whatsapp,
    email: e.email,
    telefono: e.telefono,
    publicado: e.publicado };
}

const plural = (n: number, a: string, b: string) => `${n} ${n === 1 ? a : b}`;

export function Especialistas({
  inicial,
  usuarios,
  api = apiReal,
  abrirId = null }: {
  inicial: EspecialistaItem[] | { error: string };
  usuarios: { id: string; name: string }[];
  api?: ApiEspecialistas;
  abrirId?: string | null;
}) {
  const avisar = useAviso();
  const deshacible = useDeshacer();
  const { puede } = useCollection();
  const editable = puede("sitio.editar");
  const sensores = useSensoresOrden();

  const [items, setItems] = useState<EspecialistaItem[]>(Array.isArray(inicial) ? inicial : []);
  const entrada = useEntradaLista(items.length > 0);
  const [abierto, setAbierto] = useState<string | null>(abrirId);
  const error = Array.isArray(inicial) ? null : inicial.error;

  const actual = items.find((x) => x.id === abierto) ?? null;
  const guardado = useGuardadoDiferido(
    actual,
    abierto,
    (e) => (e ? api.actualizar(e.id, payload(e)) : Promise.resolve({ ok: true as const, data: null })),
    editable && !!actual,
  );
  const cambiar = (parcial: Partial<EspecialistaItem>) =>
    setItems((l) => l.map((x) => (x.id === abierto ? { ...x, ...parcial } : x)));
  const cerrar = () => {
    void guardado.ya();
    setAbierto(null);
  };

  const crear = async (nombre: string) => {
    const r = await api.crear({ nombre });
    if (!r.ok) {
      avisar(r.error, "error");
      return false;
    }
    const nuevo: EspecialistaItem = {
      id: r.data.id,
      nombre,
      region: "",
      frase: "",
      idiomas: [],
      retrato: null,
      whatsapp: "",
      email: "",
      telefono: "",
      publicado: false,
      orden: items.length,
      userId: null,
      bio: "",
      experiencias: 0 };
    setItems((l) => [...l, nuevo]);
    setAbierto(nuevo.id);
    return true;
  };

  // El interruptor de la tarjeta guarda al toque, con todo lo demás como está.
  const guardarVisible = async (e: EspecialistaItem, publicado: boolean) => {
    setItems((l) => l.map((x) => (x.id === e.id ? { ...x, publicado } : x)));
    const r = await api.actualizar(e.id, payload({ ...e, publicado }));
    if (!r.ok) {
      setItems((l) => l.map((x) => (x.id === e.id ? { ...x, publicado: !publicado } : x)));
      avisar(r.error, "error");
      return false;
    }
    return true;
  };

  // Publicar u ocultar cambia el sitio al toque: el aviso ofrece volver atrás (acción inversa).
  const publicar = (e: EspecialistaItem, publicado: boolean) =>
    deshacible({
      mensaje: `${e.nombre} ${publicado ? "ya se ve" : "ya no se ve"} en el sitio.`,
      aplicar: () => guardarVisible(e, publicado),
      deshacer: () => void guardarVisible({ ...e, publicado }, !publicado),
    });

  const alSoltar = async (ev: DragEndEvent) => {
    if (!ev.over || ev.active.id === ev.over.id) return;
    const previo = items;
    const nuevo = arrayMove(
      items,
      items.findIndex((x) => x.id === ev.active.id),
      items.findIndex((x) => x.id === ev.over!.id),
    );
    setItems(nuevo);
    const r = await api.reordenar(nuevo.map((x) => x.id));
    if (!r.ok) {
      setItems(previo);
      avisar(r.error, "error");
    }
  };

  // Borrado diferido: sale de la grilla al toque y el servidor se entera
  // cuando vence el aviso. "Deshacer" lo repone sin llamar a nadie.
  const eliminar = async () => {
    if (!actual) return null;
    const x = actual;
    const i = items.findIndex((y) => y.id === x.id);
    setAbierto(null);
    void deshacible({
      mensaje: `Eliminaste ${x.nombre}.`,
      aplicar: () => setItems((l) => l.filter((y) => y.id !== x.id)),
      deshacer: () => setItems((l) => reponer(l, i, x)),
      confirmar: async () => {
        const r = await api.eliminar(x.id);
        if (!r.ok) {
          setItems((l) => reponer(l, i, x));
          avisar(r.error, "error");
        }
      },
    });
    return null;
  };

  const publicados = items.filter((x) => x.publicado).length;

  return (
    <div className="mx-auto max-w-[1600px]">
      <EncabezadoPagina
        titulo="Quienes arman cada viaje"
        descripcion={
          <>
            <Numero valor={items.length} /> {items.length === 1 ? "especialista" : "especialistas"} · <Numero valor={publicados} /> en el sitio
          </>
        }
        acciones={editable && items.length > 0 && <NuevoEnLinea etiqueta="Nuevo especialista" placeholder="Nombre y apellido" onCrear={crear} />}
      />

      {error && (
        <p role="alert" className="mb-6 text-col-md text-col-alerta">
          {error}
        </p>
      )}

      {items.length === 0 ? (
        <Vacio
          icono={UserRound}
          titulo="Todavía no hay especialistas"
          texto="Quienes arman los viajes: cada experiencia muestra a su especialista con foto y contacto."
          accion={editable && <NuevoEnLinea etiqueta="Nuevo especialista" placeholder="Nombre y apellido" onCrear={crear} />}
        />
      ) : (
        <DndContext sensors={sensores} collisionDetection={closestCenter} onDragEnd={(e) => void alSoltar(e)}>
          <SortableContext items={items.map((x) => x.id)} strategy={rectSortingStrategy} disabled={!editable}>
            <ul className="grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
              <LayoutGroup>
              <AnimatePresence mode="popLayout">
                {items.map((e, i) => (
                  <Tarjeta
                    key={e.id}
                    e={e}
                    i={i}
                    entrada={entrada}
                    editable={editable}
                    onAbrir={() => setAbierto(e.id)}
                    onPublicar={(v) => void publicar(e, v)}
                  />
                ))}
              </AnimatePresence>
              </LayoutGroup>
            </ul>
          </SortableContext>
        </DndContext>
      )}
      {editable && items.length > 1 && (
        <p className="mt-12 text-center text-col-sm text-col-muted">Arrastrá los retratos para cambiar el orden en el sitio.</p>
      )}

      <Hoja abierta={!!actual} titulo={actual?.nombre || "Especialista"} estado={guardado.estado} onCerrar={cerrar}>
        {actual && (
          <EditorEspecialista
            e={actual}
            usuarios={usuarios}
            editable={editable}
            error={guardado.error}
            cambiar={cambiar}
            onEliminar={eliminar}
          />
        )}
      </Hoja>
    </div>
  );
}

function Retrato({ e, sizes }: { e: Pick<EspecialistaItem, "nombre" | "retrato">; sizes: string }) {
  return e.retrato ? (
    <MedioImagen medio={e.retrato} relleno encuadre="4:5" sizes={sizes} imgClassName="group-hover:scale-[1.03]" />
  ) : (
    <div className="absolute inset-0 flex items-center justify-center" style={{ background: fondoDeColor(tonoDe(e.nombre)) }}>
      <span className="font-col-display text-col-display-lg font-light italic text-col-base/70">{iniciales(e.nombre)}</span>
    </div>
  );
}

// forwardRef: AnimatePresence en modo popLayout necesita el nodo para sacar del flujo al que se va.
const Tarjeta = forwardRef<HTMLLIElement, {
  e: EspecialistaItem;
  i: number;
  editable: boolean;
  onAbrir: () => void;
  onPublicar: (v: boolean) => void;
  entrada: ReturnType<typeof useEntradaLista>;
}>(function Tarjeta({ e, i, editable, onAbrir, onPublicar, entrada }, ref) {
  const orden = useSortable({ id: e.id, disabled: !editable, transition: TRANSICION_SOLTAR });
  const { setNodeRef, isDragging } = orden;
  const o = estiloOrden(orden);
  const nodo = useRefsUnidos(setNodeRef, ref);
  return (
    <motion.li
      ref={nodo}
      {...entrada(i, o.atenuado)}
      layout={!isDragging}
      style={o.style}
      className="group relative"
    >
      <button
        type="button"
        onClick={onAbrir}
        aria-label={`Editar a ${e.nombre}`}
        className="block w-full rounded-col-sm text-left"
      >
        <div
          className={cn(
            "relative aspect-[4/5] overflow-hidden rounded-col-sm bg-col-line",
            tarjetaElevable,
            o.levantado && claseLevantado,
            !e.publicado && "grayscale-[0.6]",
          )}
        >
          <Retrato e={e} sizes="(min-width: 1536px) 20vw, (min-width: 1024px) 25vw, 50vw" />
          {!e.publicado && (
            <Estado tono="neutro" className="absolute left-3 top-3 shadow-col-1">
              Oculto
            </Estado>
          )}
        </div>
        <p className="mt-4 font-col-display text-col-xl leading-[1.15] text-col-ink">{e.nombre}</p>
        <p className="mt-1 truncate text-col-sm text-col-slate">{e.region || "Sin región"}</p>
      </button>
      {editable && <AsaTarjeta nombre={e.nombre} orden={orden} />}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-col-line pt-3">
        <span className="text-col-sm text-col-slate">
          {plural(e.experiencias, "experiencia", "experiencias")}
        </span>
        <Interruptor
          checked={e.publicado}
          onCheckedChange={onPublicar}
          disabled={!editable}
          label={`Publicar a ${e.nombre}`}
          texto={e.publicado ? "Publicado" : "Oculto"}
        />
      </div>
    </motion.li>
  );
});

const PAGINA_PREVIEW = { preview: true, consultar: () => {} };

function EditorEspecialista({
  e,
  usuarios,
  editable,
  error,
  cambiar,
  onEliminar }: {
  e: EspecialistaItem;
  usuarios: { id: string; name: string }[];
  editable: boolean;
  error: string | null;
  cambiar: (p: Partial<EspecialistaItem>) => void;
  onEliminar: () => Promise<string | null>;
}) {
  const ro = !editable;
  const [vista] = useState(demoVacia);
  // Si el usuario vinculado no está en la lista (inactivo), igual se muestra.
  const opciones = e.userId && !usuarios.some((u) => u.id === e.userId) ? [...usuarios, { id: e.userId, name: "Usuario inactivo" }] : usuarios;

  return (
    <>
      <div className="bg-col-base px-6 py-7">
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <Eyebrow>Vista previa</Eyebrow>
          <span className="text-col-xs text-col-slate">Así sale al pie de cada experiencia</span>
        </div>
        <Escalado ancho={820}>
          <PaginaCtx.Provider value={PAGINA_PREVIEW}>
            <div className="cs-raiz" data-modo="preview">
              <Especialista v={{ ...vista, titulo: "tu próximo viaje", especialista: e }} />
            </div>
          </PaginaCtx.Provider>
        </Escalado>
        {error && (
          <p role="alert" className="mt-3 text-col-sm text-col-alerta">
            {error}
          </p>
        )}
        {ro && <p className="mt-3 text-col-sm text-col-slate">Solo lectura: te falta el permiso para editar el sitio.</p>}
      </div>

      <div className="flex flex-col gap-9 px-6 py-8">
        <div className="grid grid-cols-1 items-start gap-6 sm:grid-cols-[132px_minmax(0,1fr)] [&>:first-child]:max-w-[132px]">
          <CampoRetrato retrato={e.retrato} nombre={e.nombre} editable={editable} onCambio={(m) => cambiar({ retrato: m })} />
          <div className="flex flex-col gap-7">
            <Campo etiqueta="Nombre" htmlFor="e-nombre">
              <input
                id="e-nombre"
                value={e.nombre}
                maxLength={100}
                disabled={ro}
                onChange={(ev) => cambiar({ nombre: ev.target.value })}
                className={cn(entradaTitulo, "text-col-2xl leading-tight")}
              />
            </Campo>
            <Campo etiqueta="Región" htmlFor="e-region" ayuda="Completá “Tu especialista en …”.">
              <input
                id="e-region"
                value={e.region}
                maxLength={120}
                disabled={ro}
                placeholder="Asia y Oceanía"
                onChange={(ev) => cambiar({ region: ev.target.value })}
                className={entrada}
              />
            </Campo>
          </div>
        </div>

        <Campo etiqueta="Usuario de Traveloz" htmlFor="e-user" ayuda="Opcional. Vincula el perfil con su usuario del sistema.">
          <div className="relative">
          <select
            id="e-user"
            value={e.userId ?? ""}
            disabled={ro}
            onChange={(ev) => cambiar({ userId: ev.target.value || null })}
            className={entradaSelect}
          >
            <option value="">Sin usuario</option>
            {opciones.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
          </div>
        </Campo>

        <Campo etiqueta="Frase" htmlFor="e-frase" accion={<Contador n={e.frase.length} max={240} ideal={140} />}>
          <textarea
            id="e-frase"
            rows={2}
            value={e.frase}
            maxLength={240}
            disabled={ro}
            placeholder="Lo que diría al conocerte."
            onChange={(ev) => cambiar({ frase: ev.target.value })}
            className={cn(entradaArea, "font-col-display text-col-xl italic leading-snug")}
          />
        </Campo>

        <div className="flex flex-col gap-2">
          <span className={etiquetaCampo}>Bio</span>
          <EditorTexto
            etiqueta="Bio del especialista"
            valor={e.bio}
            onCambio={(html) => cambiar({ bio: html })}
            placeholder="Dónde vivió, qué recorrió, qué le gusta mostrar."
            maximo={2500}
            deshabilitado={ro}
            compacto
          />
        </div>

        <Campo etiqueta="Idiomas" ayuda="Enter para sumar cada uno.">
          <ChipsTexto
            valores={e.idiomas}
            onCambio={(v) => cambiar({ idiomas: v })}
            placeholder="Español, inglés…"
            max={10}
            maxLargo={40}
            label="Sumar idioma"
            deshabilitado={ro}
          />
        </Campo>

        <section className="flex flex-col gap-7 border-t border-col-line pt-8">
          <h3 className="font-col-display text-col-xl leading-tight text-col-ink">Canales</h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-7">
            <Campo etiqueta="WhatsApp" htmlFor="e-wa">
              <input
                id="e-wa"
                type="tel"
                value={e.whatsapp}
                maxLength={40}
                disabled={ro}
                placeholder="+598 99 123 456"
                onChange={(ev) => cambiar({ whatsapp: ev.target.value })}
                className={entrada}
              />
            </Campo>
            <Campo etiqueta="Teléfono" htmlFor="e-tel">
              <input
                id="e-tel"
                type="tel"
                value={e.telefono}
                maxLength={40}
                disabled={ro}
                onChange={(ev) => cambiar({ telefono: ev.target.value })}
                className={entrada}
              />
            </Campo>
            <Campo etiqueta="Email" htmlFor="e-email" className="col-span-2">
              <input
                id="e-email"
                type="email"
                value={e.email}
                maxLength={160}
                disabled={ro}
                placeholder="nombre@traveloz.com.uy"
                onChange={(ev) => cambiar({ email: ev.target.value })}
                className={entrada}
              />
            </Campo>
          </div>
        </section>

        <div className="flex items-center justify-between gap-4 border-t border-col-line pt-8">
          <div>
            <p className="text-col-cuerpo text-col-ink">Publicado</p>
            <p className="mt-1 text-col-sm text-col-slate">Apagado, no aparece en el sitio ni en sus experiencias.</p>
          </div>
          <Interruptor checked={e.publicado} onCheckedChange={(v) => cambiar({ publicado: v })} disabled={ro} label="Publicado" />
        </div>

        {editable && (
          <ZonaEliminar texto={`¿Eliminar a ${e.nombre}? Vas a tener unos segundos para deshacerlo.`} onEliminar={onEliminar} />
        )}
      </div>
    </>
  );
}

const ENCUADRE_RETRATO: Aspecto[] = ["4:5"];

function CampoRetrato({
  retrato,
  nombre,
  editable,
  onCambio }: {
  retrato: MedioVista | null;
  nombre: string;
  editable: boolean;
  onCambio: (m: MedioVista | null) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const encuadre = useEditorEncuadre(ENCUADRE_RETRATO, onCambio);
  const elegir = (m: MedioVista | null) => {
    onCambio(m);
    encuadre.abrir(m, true);
  };
  return (
    <div className="flex flex-col gap-2">
      <span className={etiquetaCampo}>Retrato</span>
      <SoltarAqui tipo="FOTO" deshabilitado={!editable} onMedio={elegir}>
      {retrato ? (
        <div className="group relative aspect-[4/5] overflow-hidden rounded-col-sm">
          <Retrato e={{ nombre, retrato }} sizes="160px" />
          {editable && (
            <div className="absolute inset-x-1.5 bottom-1.5 flex justify-end gap-1.5 opacity-0 transition-opacity duration-col ease-col focus-within:opacity-100 group-hover:opacity-100">
              <button
                type="button"
                aria-label="Cambiar retrato"
                onClick={() => setAbierto(true)}
                className="flex h-8 w-8 items-center justify-center rounded-col-sm bg-col-ink/70 text-col-base backdrop-blur-sm hover:bg-col-ink"
              >
                <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.75} />
              </button>
              <button
                type="button"
                aria-label="Quitar retrato"
                onClick={() => onCambio(null)}
                className="flex h-8 w-8 items-center justify-center rounded-col-sm bg-col-ink/70 text-col-base backdrop-blur-sm hover:bg-col-ink"
              >
                <X className="h-3.5 w-3.5" strokeWidth={1.75} />
              </button>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          disabled={!editable}
          onClick={() => setAbierto(true)}
          className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-2 rounded-col-sm border border-dashed border-col-slate/30 bg-col-base text-col-slate transition-colors duration-col ease-col hover:border-col-gold hover:text-col-ink disabled:pointer-events-none"
        >
          <ImagePlus className="h-5 w-5 text-col-gold" strokeWidth={1.4} aria-hidden />
          <span className="text-col-sm font-medium">Elegir</span>
        </button>
      )}
      </SoltarAqui>
      {retrato && editable && <BotonEncuadre onClick={() => encuadre.abrir(retrato)} className="self-start" />}
      <SelectorMedios
        abierto={abierto}
        onCerrar={() => setAbierto(false)}
        tipo="FOTO"
        titulo="Retrato"
        onElegir={(m) => elegir(m[0] ?? null)}
      />
      {encuadre.editor}
    </div>
  );
}
