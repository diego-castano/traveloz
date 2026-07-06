"use client";

// ---------------------------------------------------------------------------
// Publicación — single tab that controls EVERYTHING related to the public
// life of a paquete. Replaces the former FrontendTab + PublicacionTab split:
//
//   • `publicado` (boolean) — is this visible on the public site RIGHT NOW.
//   • `estado` (enum) — internal lifecycle: BORRADOR → EN_REVISION → ACTIVO
//     → ARCHIVADO. Toggling "Publicar" auto-bumps estado to ACTIVO when the
//     paquete is still in BORRADOR/EN_REVISION (handled server-side in
//     updatePaqueteFrontend). Moving estado OUT of ACTIVO auto-unpublishes
//     (handled in updatePaqueteLifecycle).
//
// All public-content fields (slug, hero, textos, SEO, servicios incluidos)
// live here too; el resto del lifecycle (estado, destacado, etiquetas) vive
// acá. La vigencia (validezDesde/Hasta) se edita desde la pestaña Datos, donde
// se vincula automáticamente al período de viaje.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Save, ExternalLink, Eye, EyeOff, Star, AlertCircle, GripVertical } from "lucide-react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Toggle } from "@/components/ui/Toggle";
import { Select } from "@/components/ui/Select";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Tag, type TagColor } from "@/components/ui/Tag";
import { useToast } from "@/components/ui/Toast";
import {
  getPaqueteFrontendData,
  updatePaqueteFrontend,
  updatePaqueteLifecycle,
  assignPaqueteEtiqueta,
  removePaqueteEtiqueta,
  setPaqueteServicios,
  getSugerenciasIncluye,
} from "@/actions/paquete-frontend.actions";
import { listServicios } from "@/actions/catalogo-servicios.actions";
import { IncluyeEditor } from "./IncluyeEditor";
import {
  type IncluyeItem,
  parseIncluyeItems,
  serializeIncluyeItems,
  legacyTextToIncluye,
  newIncluyeId,
  DEFAULT_INCLUYE_ICON,
} from "@/lib/incluye";
import { ImageUploader, type ImageItem } from "@/components/ui/ImageUploader";
import { RichTextEditor } from "@/app/backend/web/_components/RichTextEditor";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useUnsavedWarn } from "@/hooks/useUnsavedWarn";
import { AutoSaveIndicator } from "@/components/ui/AutoSaveIndicator";
import {
  EstadoHelpPanel,
  type EstadoKey,
} from "@/components/ui/EstadoHelp";
import { useEtiquetas } from "@/components/providers/CatalogProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { parseStoredDate } from "@/lib/date";
import {
  usePackageDispatch,
  usePaqueteById,
  usePaqueteServices,
  usePackageActions,
} from "@/components/providers/PackageProvider";
import type { EstadoPaquete } from "@/lib/types";
import {
  getPublicacionModulosOrden,
  savePublicacionModulosOrden,
} from "@/actions/publicacion-orden.actions";
import {
  DEFAULT_PUBLICACION_ORDEN,
  type PublicacionModuloId,
} from "@/lib/publicacion-modulos";

type Servicio = { id: string; nombre: string; icon: string; activo?: boolean };

type EtiquetaAssignment = {
  id: string;
  etiqueta: { id: string; nombre: string; slug: string; color: string };
};

// ---------------------------------------------------------------------------
// Estado options — pipeline visible to the operator. INACTIVO is intentionally
// absent: legacy rows still using it show up tagged "(legado)" in the list
// view, but new edits should only choose between the four canonical states.
// ---------------------------------------------------------------------------
const ESTADO_OPTIONS: { value: EstadoPaquete; label: string }[] = [
  { value: "BORRADOR", label: "Borrador" },
  { value: "EN_REVISION", label: "En revisión" },
  { value: "ACTIVO", label: "Activo" },
  { value: "ARCHIVADO", label: "Archivado" },
];

// Etiqueta legible de cada módulo (sólo para accesibilidad del drag handle).
const MODULO_LABELS: Record<PublicacionModuloId, string> = {
  estado: "Estado y visibilidad",
  etiquetas: "Etiquetas",
  slider: "Slider de fotos",
  textos: "Textos del paquete",
  incluye: "Qué incluye",
  condiciones: "Condiciones específicas",
  seo: "SEO",
};

const hexToTagColor: Record<string, TagColor> = {
  "#22c55e": "green",
  "#06b6d4": "blue",
  "#8b5cf6": "violet",
  "#1e293b": "teal",
  "#f97316": "orange",
  "#ec4899": "red",
  "#3b82f6": "blue",
  "#14b8a6": "teal",
};

function getTagColor(hex: string): TagColor {
  return hexToTagColor[hex.toLowerCase()] ?? "teal";
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Detecta si un string ya viene como HTML (editado con el editor enriquecido)
// o como texto plano legacy guardado antes de tener formato.
function looksLikeHtml(s: string): boolean {
  return /<[a-z][\s\S]*>/i.test(s);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Texto plano legacy → HTML, para que al cargarlo en el editor enriquecido
// los saltos de línea se preserven (contenteditable ignora los "\n" crudos).
// Si el valor ya es HTML lo dejamos intacto.
function toEditorHtml(value: string | null | undefined): string {
  const v = value ?? "";
  if (!v) return "";
  if (looksLikeHtml(v)) return v;
  return escapeHtml(v).replace(/\r?\n/g, "<br>");
}

// Campo de texto enriquecido. Para operadores sin permiso de edición
// renderiza el HTML en modo lectura (el editor en sí no tiene estado disabled).
function RichField({
  value,
  onChange,
  rows,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (html: string) => void;
  rows?: number;
  placeholder?: string;
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <div
        className="w-full border border-neutral-200 rounded-md px-3 py-2.5 text-sm leading-relaxed bg-neutral-50 text-neutral-600 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
        dangerouslySetInnerHTML={{ __html: value || "<span class='text-neutral-400'>—</span>" }}
      />
    );
  }
  return (
    <RichTextEditor
      value={value}
      onChange={onChange}
      rows={rows}
      placeholder={placeholder}
    />
  );
}

// Resumen de vigencia — la edición vive en la pestaña Datos. Acá solo
// mostramos el estado persistido para que el operador sepa qué tiene guardado
// sin tener que ir y volver.
function VigenciaResumen({
  validezDesde,
  validezHasta,
}: {
  validezDesde?: string | null;
  validezHasta?: string | null;
}) {
  const fmt = (iso?: string | null) => {
    const d = parseStoredDate(iso ?? null);
    if (!d) return "—";
    return d.toLocaleDateString("es-AR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="rounded-md border border-neutral-200 bg-neutral-50/60 px-3 py-2">
        <p className="text-[10px] uppercase tracking-wide text-neutral-400">
          Desde
        </p>
        <p className="text-[13px] text-neutral-700 font-medium">
          {fmt(validezDesde)}
        </p>
      </div>
      <div className="rounded-md border border-neutral-200 bg-neutral-50/60 px-3 py-2">
        <p className="text-[10px] uppercase tracking-wide text-neutral-400">
          Hasta
        </p>
        <p className="text-[13px] text-neutral-700 font-medium">
          {fmt(validezHasta)}
        </p>
      </div>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white border border-neutral-200 rounded-lg p-5 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-neutral-900">{title}</h3>
        {description && (
          <p className="text-xs text-neutral-500 mt-0.5">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

export function PublicacionTab({ paqueteId }: { paqueteId: string }) {
  const { toast } = useToast();
  const { canEdit } = useAuth();
  const allEtiquetas = useEtiquetas();
  // Cache sync: descripcion también vive en DatosTab (via el spread de
  // `paquete`). Cuando la editamos acá actualizamos la cache compartida para
  // que un guardado posterior de DatosTab no reescriba el valor viejo.
  const dispatch = usePackageDispatch();
  const cachedPaquete = usePaqueteById(paqueteId);
  const cachedPaqueteRef = useRef(cachedPaquete);
  useEffect(() => {
    cachedPaqueteRef.current = cachedPaquete;
  }, [cachedPaquete]);
  // `data` (título + vigencia) se carga una sola vez al montar y alimenta
  // placeholders (meta title, botón "Auto" del slug, vista SERP) y el resumen de
  // vigencia. Si el operador edita el título o la vigencia en la pestaña Datos,
  // esos valores quedaban stale acá. Los re-sincronizamos desde la cache del
  // provider cuando cambian, sin re-fetchear.
  useEffect(() => {
    if (!cachedPaquete) return;
    setData((prev) => {
      if (!prev) return prev;
      if (
        prev.titulo === cachedPaquete.titulo &&
        prev.validezDesde === cachedPaquete.validezDesde &&
        prev.validezHasta === cachedPaquete.validezHasta
      ) {
        return prev;
      }
      return {
        ...prev,
        titulo: cachedPaquete.titulo,
        validezDesde: cachedPaquete.validezDesde,
        validezHasta: cachedPaquete.validezHasta,
      };
    });
  }, [cachedPaquete]);
  const syncDescripcionToCache = useCallback(
    (descripcion: string) => {
      const cached = cachedPaqueteRef.current;
      if (cached && cached.descripcion !== descripcion) {
        dispatch({
          type: "UPDATE_PAQUETE",
          payload: { ...cached, descripcion },
        });
      }
    },
    [dispatch],
  );

  const [data, setData] = useState<Awaited<
    ReturnType<typeof getPaqueteFrontendData>
  > | null>(null);
  const [catalog, setCatalog] = useState<Servicio[]>([]);
  const [incluyeItems, setIncluyeItems] = useState<IncluyeItem[]>([]);
  const [assignedEtiquetas, setAssignedEtiquetas] = useState<EtiquetaAssignment[]>([]);
  const [isPending, start] = useTransition();

  // Persisted list of blockers from the last publish attempt. Stays visible
  // until cleared (either by re-trying publish or by patching a related
  // field), so the operator can take their time to fix each one — much
  // better than a transient toast that disappears.
  const [publishBlockers, setPublishBlockers] = useState<string[]>([]);

  // Orden GLOBAL de los módulos de esta pestaña (drag-and-drop, persistido en
  // SiteSetting). Arranca en el default y se reemplaza con el guardado al montar.
  const [modulosOrden, setModulosOrden] = useState<PublicacionModuloId[]>(
    DEFAULT_PUBLICACION_ORDEN,
  );

  // Refs to the form fields that are most commonly the cause of a publish
  // gate failure. When the server returns "missing: slug" we scroll the
  // corresponding field into view and flash a red ring around it.
  const heroFieldRef = useRef<HTMLDivElement | null>(null);
  const slugFieldRef = useRef<HTMLDivElement | null>(null);
  const [flashField, setFlashField] = useState<"slug" | "hero" | null>(null);

  // Form: public-content fields (saved via updatePaqueteFrontend) + lifecycle
  // fields (saved via updatePaqueteLifecycle). Kept in one state object so the
  // sticky save bar and autosave work uniformly.
  const [form, setForm] = useState({
    slug: "",
    publicado: false,
    metaTitle: "",
    metaDescription: "",
    heroImage: "",
    descripcion: "",
    textoIntro: "",
    textoIncluye: "",
    itinerarioPublico: "",
    textoCondiciones: "",
    // Lifecycle
    estado: "BORRADOR" as EstadoPaquete,
    destacado: false,
  });

  useEffect(() => {
    Promise.all([getPaqueteFrontendData(paqueteId), listServicios()]).then(
      ([d, s]) => {
        if (d) {
          setData(d);
          setForm({
            slug: d.slug ?? "",
            publicado: d.publicado,
            metaTitle: d.metaTitle ?? "",
            metaDescription: d.metaDescription ?? "",
            heroImage: d.heroImage ?? "",
            descripcion: d.descripcion ?? "",
            textoIntro: toEditorHtml(d.textoIntro),
            textoIncluye: toEditorHtml(d.textoIncluye),
            itinerarioPublico: toEditorHtml(d.itinerarioPublico),
            textoCondiciones: toEditorHtml(d.textoCondiciones),
            estado: d.estado,
            destacado: d.destacado,
          });
          // Build the Incluye list: the canonical JSON list if present, else
          // migrate legacy content (catalog services + free-text bullets) into
          // editable items. Nothing is persisted until the operator saves.
          const parsedIncluye = parseIncluyeItems(d.textoIncluye);
          if (parsedIncluye) {
            setIncluyeItems(parsedIncluye);
          } else {
            const fromCatalog: IncluyeItem[] = d.serviciosIncluidos.map((x) => ({
              id: newIncluyeId(),
              servicioId: x.servicio.id,
              icon: x.servicio.icon || DEFAULT_INCLUYE_ICON,
              texto: x.textoCustom ?? x.servicio.nombre,
            }));
            setIncluyeItems([
              ...fromCatalog,
              ...legacyTextToIncluye(d.textoIncluye),
            ]);
          }
          setAssignedEtiquetas(d.etiquetas);
        }
        setCatalog(s);
      },
    );
  }, [paqueteId]);

  // El orden es global (mismo para todos los paquetes): se carga una sola vez.
  useEffect(() => {
    getPublicacionModulosOrden()
      .then(setModulosOrden)
      .catch(() => {
        /* degradamos al default ya seteado */
      });
  }, []);

  const assignedEtiquetaIds = useMemo(
    () => new Set(assignedEtiquetas.map((pe) => pe.etiqueta.id)),
    [assignedEtiquetas],
  );

  const availableEtiquetas = useMemo(
    () => allEtiquetas.filter((e) => !assignedEtiquetaIds.has(e.id)),
    [allEtiquetas, assignedEtiquetaIds],
  );

  // Catalog services available to add as Incluye items (active ones only).
  const catalogServicios = useMemo(
    () =>
      catalog
        .filter((s) => s.activo !== false)
        .map((s) => ({ id: s.id, nombre: s.nombre, icon: s.icon })),
    [catalog],
  );

  // The Incluye list persists as JSON in `textoIncluye`; the catalog-backed
  // subset is mirrored into `serviciosIncluidos` so that relation stays in
  // sync for any other consumer (publish gate, reporting).
  const serviciosFromIncluye = useCallback(
    (its: IncluyeItem[]) =>
      its
        .filter((it) => it.servicioId)
        .map((it, i) => ({
          servicioId: it.servicioId as string,
          textoCustom: it.texto,
          orden: i,
        })),
    [],
  );

  // ---------------------------------------------------------------------------
  // Save — frontend fields (slug/publicado/textos/SEO) + servicios. Lifecycle
  // fields go through their own action so we can keep the publish gate scoped
  // to publicado-only transitions.
  // ---------------------------------------------------------------------------
  const saveFrontend = useCallback(async () => {
    const res = await updatePaqueteFrontend(paqueteId, {
      slug: form.slug,
      publicado: form.publicado,
      metaTitle: form.metaTitle,
      metaDescription: form.metaDescription,
      heroImage: form.heroImage,
      descripcion: form.descripcion,
      textoIntro: form.textoIntro,
      textoIncluye: serializeIncluyeItems(incluyeItems),
      itinerarioPublico: form.itinerarioPublico,
      textoCondiciones: form.textoCondiciones,
    });
    if (!res.ok) {
      // publish_blocked (falta algo para publicar) o slug_taken (colisión de
      // slug). En ambos casos devolvemos los motivos para que la UI los muestre.
      return { ok: false, reason: res.reason, missing: res.missing };
    }
    // Server may have auto-bumped estado to ACTIVO — reflect it locally.
    if (res.ok && form.publicado && form.estado !== "ACTIVO") {
      setForm((p) => ({ ...p, estado: "ACTIVO" }));
    }
    // Mismo wrap que handleAutoSave: la sync secundaria de PaqueteServicio
    // es opcional (la lista visible la arma el front desde textoIncluye,
    // ya guardada arriba). Si falla, los cambios del formulario ya
    // quedaron persistidos y el guardado debe reportarse como exitoso.
    try {
      await setPaqueteServicios(paqueteId, serviciosFromIncluye(incluyeItems));
    } catch (e) {
      console.error(
        "[PublicacionTab] setPaqueteServicios failed; front fields were already saved",
        e,
      );
    }
    syncDescripcionToCache(form.descripcion);
    return { ok: true };
  }, [paqueteId, form, incluyeItems, serviciosFromIncluye, syncDescripcionToCache]);

  // Surface a publish-blocker visually: scroll the relevant field into
  // view + flash it. Picks the highest-priority issue from the missing list.
  const focusBlockerField = useCallback((missing: string[]) => {
    const inSlug = missing.some((m) => m.toLowerCase().includes("slug"));
    const inHero = missing.some((m) => m.toLowerCase().includes("foto"));
    const target = inSlug ? "slug" : inHero ? "hero" : null;
    if (!target) return;
    const node = target === "slug" ? slugFieldRef.current : heroFieldRef.current;
    if (!node) return;
    node.scrollIntoView({ behavior: "smooth", block: "center" });
    setFlashField(target);
    window.setTimeout(() => setFlashField(null), 2400);
  }, []);

  const onForceSave = () =>
    start(async () => {
      try {
        const res = await saveFrontend();
        if (!res.ok && res.missing) {
          setPublishBlockers(res.missing);
          focusBlockerField(res.missing);
          if (res.reason === "slug_taken") {
            toast("error", "Slug en uso", res.missing[0]);
          } else {
            toast(
              "warning",
              "No se puede publicar todavía",
              `Revisá lo que falta más arriba.`,
            );
            setForm((prev) => ({ ...prev, publicado: false }));
          }
          return;
        }
        setPublishBlockers([]);
        toast(
          "success",
          "Cambios guardados",
          "El sitio público se actualiza en menos de 1 minuto.",
        );
      } catch (e) {
        toast("error", "Error al guardar", (e as Error).message);
      }
    });

  // ---------------------------------------------------------------------------
  // Auto-save — refs let the debounced handler always read latest state
  // without re-creating the useAutoSave handler on every keystroke.
  // ---------------------------------------------------------------------------
  const formRef = useRef(form);
  const incluyeItemsRef = useRef(incluyeItems);
  useEffect(() => {
    formRef.current = form;
  }, [form]);
  useEffect(() => {
    incluyeItemsRef.current = incluyeItems;
  }, [incluyeItems]);

  const handleAutoSave = useCallback(async () => {
    const f = formRef.current;
    const res = await updatePaqueteFrontend(paqueteId, {
      slug: f.slug,
      publicado: f.publicado,
      metaTitle: f.metaTitle,
      metaDescription: f.metaDescription,
      heroImage: f.heroImage,
      descripcion: f.descripcion,
      textoIntro: f.textoIntro,
      textoIncluye: serializeIncluyeItems(incluyeItemsRef.current),
      itinerarioPublico: f.itinerarioPublico,
      textoCondiciones: f.textoCondiciones,
    });
    if (!res.ok) {
      setPublishBlockers(res.missing);
      focusBlockerField(res.missing);
      if (res.reason === "slug_taken") {
        toast("error", "Slug en uso", res.missing[0]);
      } else {
        toast(
          "warning",
          "No se puede publicar todavía",
          `Revisá lo que falta más arriba.`,
        );
        setForm((prev) => ({ ...prev, publicado: false }));
      }
      return;
    }
    setPublishBlockers([]);
    if (res.ok && formRef.current.publicado && formRef.current.estado !== "ACTIVO") {
      setForm((p) => ({ ...p, estado: "ACTIVO" }));
    }
    // Sincronización secundaria: la tabla `PaqueteServicio` (catálogo → paquete)
    // es opcional. La lista visible la arma el front desde `textoIncluye` (el
    // JSON ya guardado arriba). Si esta sync falla, NO debe quedar el indicador
    // en "Error al guardar" indefinidamente: los cambios del formulario ya
    // quedaron persistidos, así que logueamos y dejamos que el próximo autosave
    // se encargue. Antes este throw sin catch rompía la sesión y el operador
    // tenía que refrescar la página para volver a guardar.
    try {
      await setPaqueteServicios(
        paqueteId,
        serviciosFromIncluye(incluyeItemsRef.current),
      );
    } catch (e) {
      console.error(
        "[PublicacionTab] setPaqueteServicios failed; front fields were already saved",
        e,
      );
    }
    syncDescripcionToCache(formRef.current.descripcion);
  }, [paqueteId, toast, focusBlockerField, serviciosFromIncluye, syncDescripcionToCache]);

  const { status: autoSaveStatus, markDirty, saveNow } = useAutoSave({
    onSave: handleAutoSave,
    enabled: !!data,
  });

  // Warn the operator if they close the tab while autosave is mid-flight or
  // there are unsaved keystrokes pending the debounce.
  useUnsavedWarn(autoSaveStatus);

  const patch = useCallback(
    <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      markDirty();
    },
    [markDirty],
  );
  const handleIncluyeChange = useCallback(
    (next: IncluyeItem[]) => {
      setIncluyeItems(next);
      markDirty();
    },
    [markDirty],
  );

  const handleGenerarIncluye = useCallback(
    () => getSugerenciasIncluye(paqueteId),
    [paqueteId],
  );

  // ---------------------------------------------------------------------------
  // Slider gallery — managed in-place (replaces the old "Fotos" tab). Photos
  // persist immediately through the package provider; the featured photo is the
  // Paquete's heroImage URL, picked from the gallery via the star (any photo,
  // independent of order) and saved with the rest of the publish form.
  // ---------------------------------------------------------------------------
  const { fotos } = usePaqueteServices(paqueteId);
  const { addFoto, removeFoto, updateFoto } = usePackageActions();

  const galleryImages: ImageItem[] = fotos.map((f) => ({
    id: f.id,
    url: f.url,
    alt: f.alt,
    posX: f.posX,
    posY: f.posY,
    zoom: f.zoom,
  }));

  // The featured photo, resolved from heroImage. Empty string keeps the
  // ImageUploader in "pick by id" mode with nothing selected yet.
  const principalFotoId = fotos.find((f) => f.url === form.heroImage)?.id ?? "";

  const handleAddFotos = useCallback(
    (urls: string[]) => {
      urls.forEach((url, i) => {
        addFoto({
          paqueteId,
          url,
          alt: `Foto ${fotos.length + i + 1}`,
          orden: fotos.length + i,
        });
      });
    },
    [addFoto, paqueteId, fotos.length],
  );

  const handleRemoveFoto = useCallback(
    (id: string) => {
      const target = fotos.find((f) => f.id === id);
      removeFoto(id);
      // Removing the featured photo clears the slider hero so we don't keep a
      // dangling heroImage URL that no longer exists in the gallery.
      if (target && target.url === form.heroImage) patch("heroImage", "");
    },
    [removeFoto, fotos, form.heroImage, patch],
  );

  const handleReorderFotos = useCallback(
    (reordered: ImageItem[]) => {
      reordered.forEach((img, newIndex) => {
        const original = fotos.find((f) => f.id === img.id);
        if (original && original.orden !== newIndex) {
          updateFoto({ ...original, orden: newIndex });
        }
      });
    },
    [fotos, updateFoto],
  );

  const handleSetPrincipalFoto = useCallback(
    (id: string) => {
      const target = fotos.find((f) => f.id === id);
      if (target) patch("heroImage", target.url);
    },
    [fotos, patch],
  );

  const handleUpdateFocal = useCallback(
    (id: string, focal: { posX: number; posY: number; zoom: number }) => {
      const original = fotos.find((f) => f.id === id);
      if (original) updateFoto({ ...original, ...focal });
    },
    [fotos, updateFoto],
  );

  // ---------------------------------------------------------------------------
  // Lifecycle handlers — fire-and-forget server calls (no debounce: estado is
  // a discrete pick, not a typing-stream). Failures surface as a toast.
  // ---------------------------------------------------------------------------
  const handleEstadoChange = (value: string) => {
    const newEstado = value as EstadoPaquete;
    // Snapshot para revertir si el server falla (update optimista sin rollback
    // dejaba el select mostrando un estado que la DB nunca guardó).
    const prevEstado = form.estado;
    setForm((p) => ({ ...p, estado: newEstado }));
    updatePaqueteLifecycle(paqueteId, { estado: newEstado })
      .then((r) => {
        if (r.unpublished) {
          setForm((p) => ({ ...p, publicado: false }));
          toast(
            "info",
            "Despublicado",
            `Se quitó del sitio público al cambiar el estado a ${newEstado}.`,
          );
        } else {
          toast("success", "Estado actualizado", `Nuevo estado: ${newEstado}`);
        }
      })
      .catch((e) => {
        setForm((p) => ({ ...p, estado: prevEstado }));
        toast("error", "Error", (e as Error).message);
      });
  };

  const handleDestacadoToggle = (checked: boolean) => {
    const prevDestacado = form.destacado;
    setForm((p) => ({ ...p, destacado: checked }));
    updatePaqueteLifecycle(paqueteId, { destacado: checked })
      .then(() =>
        toast(
          "success",
          checked ? "Marcado como destacado" : "Destacado removido",
        ),
      )
      .catch((e) => {
        setForm((p) => ({ ...p, destacado: prevDestacado }));
        toast("error", "Error", (e as Error).message);
      });
  };

  const handleAddEtiqueta = async (etiquetaId: string) => {
    try {
      const created = await assignPaqueteEtiqueta(paqueteId, etiquetaId);
      const etiqueta = allEtiquetas.find((e) => e.id === etiquetaId);
      if (etiqueta) {
        setAssignedEtiquetas((prev) => [
          ...prev,
          {
            id: created.id,
            etiqueta: {
              id: etiqueta.id,
              nombre: etiqueta.nombre,
              slug: etiqueta.slug,
              color: etiqueta.color,
            },
          },
        ]);
      }
      toast("success", "Etiqueta asignada", etiqueta?.nombre ?? "");
    } catch (e) {
      toast("error", "Error", (e as Error).message);
    }
  };

  const handleRemoveEtiqueta = async (paqueteEtiquetaId: string) => {
    try {
      await removePaqueteEtiqueta(paqueteEtiquetaId);
      setAssignedEtiquetas((prev) =>
        prev.filter((pe) => pe.id !== paqueteEtiquetaId),
      );
      toast("info", "Etiqueta removida");
    } catch (e) {
      toast("error", "Error", (e as Error).message);
    }
  };

  // ---------------------------------------------------------------------------
  // Reordenar módulos — drag-and-drop. El orden se guarda global apenas se
  // suelta (optimista: actualizo la UI, persisto, revierto si falla).
  // ---------------------------------------------------------------------------
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleModulosDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = modulosOrden.indexOf(active.id as PublicacionModuloId);
    const to = modulosOrden.indexOf(over.id as PublicacionModuloId);
    if (from < 0 || to < 0) return;
    const prevOrden = modulosOrden;
    const next = arrayMove(modulosOrden, from, to);
    setModulosOrden(next);
    savePublicacionModulosOrden(next)
      .then((saved) => {
        setModulosOrden(saved);
        toast(
          "success",
          "Orden actualizado",
          "Se guardó el nuevo orden de los módulos; se aplica a todos los paquetes.",
        );
      })
      .catch((e) => {
        setModulosOrden(prevOrden);
        toast("error", "No se pudo guardar el orden", (e as Error).message);
      });
  };

  if (!data) {
    return <div className="p-6 text-sm text-neutral-500">Cargando datos…</div>;
  }

  const previewUrl =
    form.publicado && form.slug ? `/destinos/ver/${form.slug}` : null;
  const disabled = !canEdit;

  return (
    <div className="p-6 max-w-4xl space-y-5">
      {/* Header / state bar */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-neutral-900">
            Publicación
          </h2>
          <p className="text-sm text-neutral-500 mt-1">
            Controlá si este paquete aparece en el sitio público y editá toda su
            ficha pública.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm text-violet-600 hover:underline"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Ver en el sitio
            </a>
          )}
          <span
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium ring-1 ring-inset ${
              form.publicado
                ? "bg-green-50 text-green-700 ring-green-200"
                : "bg-neutral-100 text-neutral-600 ring-neutral-200"
            }`}
          >
            {form.publicado ? (
              <Eye className="w-3 h-3" />
            ) : (
              <EyeOff className="w-3 h-3" />
            )}
            {form.publicado ? "Publicado" : "Borrador"}
          </span>
        </div>
      </div>

      {/* Publish blockers — visible until resolved (no transient toast). */}
      {publishBlockers.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex gap-3">
          <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[12.5px] font-semibold text-amber-900 mb-1">
              Para publicar este paquete todavía falta:
            </p>
            <ul className="space-y-0.5">
              {publishBlockers.map((b) => (
                <li key={b} className="text-[12px] text-amber-800 leading-snug">
                  • {b}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setPublishBlockers([])}
              className="text-[11px] text-amber-700 hover:text-amber-900 underline mt-2"
            >
              Ocultar
            </button>
          </div>
        </div>
      )}

      {canEdit && (
        <p className="text-[11px] text-neutral-400 flex items-center gap-1">
          <GripVertical className="h-3 w-3 shrink-0" />
          Arrastrá los módulos para reordenarlos. El orden queda guardado y se
          aplica a todos los paquetes (al recargar o crear uno nuevo).
        </p>
      )}

      {/* Módulos reordenables — se arman acá y se renderizan en el orden
          guardado (modulosOrden). Mover una sección NO cambia su contenido ni
          sus handlers, sólo su posición. */}
      {(() => {
        const moduleNodes: Record<PublicacionModuloId, React.ReactNode> = {
          // Estado y visibilidad
          estado: (
      <Section
        title="Estado y visibilidad"
        description="El estado describe en qué etapa del flujo interno está el paquete. El toggle Publicar lo hace visible (o no) en el sitio público; al publicar, si está en Borrador o En revisión, se pasa automáticamente a Activo."
      >
        <div className="grid grid-cols-3 gap-3">
          <div
            ref={slugFieldRef}
            className={`col-span-2 rounded-md transition-shadow ${
              flashField === "slug"
                ? "ring-2 ring-red-400 ring-offset-2 ring-offset-white p-2 -m-2"
                : ""
            }`}
          >
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Slug (URL pública)
            </label>
            <div className="flex gap-2">
              <Input
                value={form.slug}
                onChange={(e) => patch("slug", slugify(e.target.value))}
                placeholder="ej. buzios-7-noches"
                className="flex-1"
                disabled={disabled}
              />
              <button
                type="button"
                onClick={() => patch("slug", slugify(data.titulo))}
                className="text-[11px] text-violet-600 hover:underline px-2"
                title="Generar desde el título"
                disabled={disabled}
              >
                Auto
              </button>
            </div>
            <p className="text-[11px] text-neutral-500 mt-1 font-mono">
              /destinos/[región]/{form.slug || "<slug>"}
            </p>
          </div>
          <div className="flex items-center pt-6">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.publicado}
                onChange={(e) => patch("publicado", e.target.checked)}
                className="w-4 h-4 rounded text-violet-600"
                disabled={disabled}
              />
              <span className="text-sm text-neutral-700">
                Publicar en el sitio
              </span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-neutral-100">
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Estado del paquete
            </label>
            <Select
              value={form.estado}
              onValueChange={handleEstadoChange}
              options={ESTADO_OPTIONS}
              disabled={disabled}
            />
            <EstadoHelpPanel current={form.estado as EstadoKey} />
          </div>
          <div className="flex items-end">
            <div className="flex items-center gap-2">
              <Toggle
                checked={form.destacado}
                onCheckedChange={handleDestacadoToggle}
                disabled={disabled}
                label="Destacado en home"
              />
              <Star className="w-4 h-4 text-amber-400" />
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-neutral-100">
          <label className="block text-xs font-medium text-neutral-700 mb-1">
            Periodo de validez
          </label>
          <VigenciaResumen validezDesde={data.validezDesde} validezHasta={data.validezHasta} />
          <p className="text-[11px] text-neutral-500 mt-1">
            Se configura desde la pestaña{" "}
            <a
              href="?tab=datos"
              className="text-violet-600 hover:underline"
            >
              Datos
            </a>
            . Por defecto se vincula al período de viaje (15 días previos al
            inicio, hasta la fecha de fin).
          </p>
        </div>
      </Section>
          ),
          // Etiquetas
          etiquetas: (
      <Section
        title="Etiquetas"
        description="Campañas, promociones y filtros que aplican a este paquete."
      >
        <div className="flex flex-wrap gap-2 mb-4 min-h-[32px]">
          {assignedEtiquetas.length === 0 ? (
            <p className="text-[13px] text-neutral-400 italic">
              Sin etiquetas asignadas
            </p>
          ) : (
            assignedEtiquetas.map((pe) => (
              <Tag
                key={pe.id}
                color={getTagColor(pe.etiqueta.color)}
                removable={canEdit}
                onRemove={() => handleRemoveEtiqueta(pe.id)}
              >
                {pe.etiqueta.nombre}
              </Tag>
            ))
          )}
        </div>

        {canEdit && availableEtiquetas.length > 0 && (
          <div className="max-w-xs">
            <SearchableSelect
              value=""
              onValueChange={handleAddEtiqueta}
              options={availableEtiquetas.map((e) => ({
                value: e.id,
                label: e.nombre,
              }))}
              placeholder="Agregar etiqueta..."
              searchPlaceholder="Buscar etiqueta..."
            />
          </div>
        )}
      </Section>

          ),
          // Slider de fotos
          slider: (
      <Section
        title="Slider de fotos"
        description="El carrusel del detalle público. Subí, ordená y borrá las fotos acá mismo, y marcá con la estrella cuál es la destacada — esa aparece primera, sin importar el orden."
      >
        <div
          ref={heroFieldRef}
          className={`rounded-md transition-shadow ${
            flashField === "hero"
              ? "ring-2 ring-red-400 ring-offset-2 ring-offset-white p-2 -m-2"
              : ""
          }`}
        >
          <ImageUploader
            images={galleryImages}
            principalId={principalFotoId}
            onAdd={canEdit ? handleAddFotos : undefined}
            onRemove={canEdit ? handleRemoveFoto : undefined}
            onReorder={canEdit ? handleReorderFotos : undefined}
            onSetPrincipal={canEdit ? handleSetPrincipalFoto : undefined}
            onUpdateFocal={canEdit ? handleUpdateFocal : undefined}
            folder="paquetes"
            maxImages={20}
          />
          {galleryImages.length > 0 && !principalFotoId && (
            <p className="mt-2 text-xs text-amber-700">
              Elegí una foto destacada con la estrella — es la que abre el
              slider y se usa como portada del paquete.
            </p>
          )}
          {galleryImages.length === 0 && !canEdit && (
            <p className="mt-2 text-center text-[13px] text-neutral-400">
              No hay fotos para este paquete
            </p>
          )}
        </div>
      </Section>

          ),
          // Textos del paquete
          textos: (
      <Section
        title="Textos del paquete"
        description="Lo que el viajero ve al entrar al detalle. Usá la barra de formato para resaltar (negrita, cursiva, subrayado, listas y links)."
      >
        <div>
          <label className="block text-sm font-semibold text-neutral-800 mb-1.5">
            Descripción breve
            <span className="text-neutral-400 font-normal ml-2 text-xs">
              (no se muestra tal cual en el detalle; alimenta el buscador interno
              y, si no completás el SEO, se usa como meta description en Google)
            </span>
          </label>
          <textarea
            value={form.descripcion}
            onChange={(e) => patch("descripcion", e.target.value)}
            className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm leading-relaxed bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
            rows={2}
            placeholder="Resumen corto del paquete para uso interno y búsquedas."
            disabled={disabled}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-neutral-800 mb-1.5">
            Texto introductorio
            <span className="text-neutral-400 font-normal ml-2 text-xs">
              (es el bloque «Sobre el destino» que ve el viajero, arriba del itinerario)
            </span>
          </label>
          <RichField
            value={form.textoIntro}
            onChange={(html) => patch("textoIntro", html)}
            rows={6}
            placeholder="Por qué este destino, qué lo hace especial, etc."
            disabled={disabled}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-neutral-800 mb-1.5">
            Itinerario público
            <span className="text-neutral-400 font-normal ml-2 text-xs">
              (día a día — distinto al itinerario interno Amadeus)
            </span>
          </label>
          <RichField
            value={form.itinerarioPublico}
            onChange={(html) => patch("itinerarioPublico", html)}
            rows={10}
            placeholder="Día 1 — Llegada y traslado al hotel."
            disabled={disabled}
          />
        </div>
      </Section>

          ),
          // Qué incluye
          incluye: (
      <Section
        title="Qué incluye (vista del cliente)"
        description="La lista que ve el viajero en la ficha pública. Tocá «Generar incluido» para armarla desde los servicios del paquete (aéreos, traslados, noches por destino con régimen, circuitos, seguros), después reordená arrastrando, editá el texto, cambiá el ícono o agregá items a mano."
      >
        <IncluyeEditor
          items={incluyeItems}
          onChange={handleIncluyeChange}
          catalog={catalogServicios}
          onGenerate={handleGenerarIncluye}
          disabled={disabled}
        />
        <p className="text-[11px] text-neutral-400 mt-2">
          Gestioná el catálogo de servicios reutilizables en{" "}
          <a
            href="/backend/catalogos/servicios"
            className="text-violet-600 hover:underline"
          >
            Catálogo de servicios
          </a>
          .
        </p>
      </Section>

          ),
          // Condiciones específicas
          condiciones: (
      <Section
        title="Condiciones específicas"
        description="Política de cancelación, pagos, requisitos especiales."
      >
        <RichField
          value={form.textoCondiciones}
          onChange={(html) => patch("textoCondiciones", html)}
          rows={8}
          placeholder="Notas que aparecen al final del detalle. Si lo dejás vacío se muestran las condiciones generales del sitio."
          disabled={disabled}
        />
      </Section>

          ),
          // SEO
          seo: (
      <Section
        title="SEO"
        description="Cómo aparece en Google y al compartir en redes."
      >
        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-1">
            Meta title
          </label>
          <Input
            value={form.metaTitle}
            onChange={(e) => patch("metaTitle", e.target.value)}
            maxLength={60}
            placeholder={data.titulo}
            disabled={disabled}
          />
          <p className="text-[10px] text-neutral-400 mt-0.5">
            {form.metaTitle.length}/60 — si lo dejás vacío, usa el título del paquete.
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-1">
            Meta description
          </label>
          <textarea
            value={form.metaDescription}
            onChange={(e) => patch("metaDescription", e.target.value)}
            className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            rows={2}
            maxLength={160}
            placeholder="Resumen de hasta 160 caracteres para los resultados de búsqueda."
            disabled={disabled}
          />
          <p className="text-[10px] text-neutral-400 mt-0.5">
            {form.metaDescription.length}/160
            {!form.metaDescription.trim() && form.descripcion.trim() && (
              <span className="ml-1 text-neutral-500">
                · vacío → se usa la “Descripción breve”
              </span>
            )}
          </p>
        </div>

        {(form.metaTitle || form.metaDescription || form.descripcion) && (
          <div className="bg-neutral-50 border border-neutral-200 rounded-md p-3 mt-3">
            <p className="text-[10px] uppercase tracking-wider text-neutral-400 mb-1.5">
              Vista previa SERP
            </p>
            <div className="text-blue-700 text-sm hover:underline cursor-pointer truncate">
              {form.metaTitle || data.titulo} — TravelOz
            </div>
            <div className="text-green-800 text-[11px] mt-0.5">
              traveloz.com.uy/destinos/.../{form.slug || "<slug>"}
            </div>
            {(form.metaDescription || form.descripcion) && (
              <div className="text-neutral-600 text-[12px] mt-1 line-clamp-2">
                {form.metaDescription || form.descripcion}
              </div>
            )}
          </div>
        )}
      </Section>

          ),
        };
        return (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleModulosDragEnd}
          >
            <SortableContext
              items={modulosOrden}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-5">
                {modulosOrden.map((id) => (
                  <SortableModule
                    key={id}
                    id={id}
                    label={MODULO_LABELS[id]}
                    draggable={canEdit}
                  >
                    {moduleNodes[id]}
                  </SortableModule>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        );
      })()}

      {/* Sticky autosave bar */}
      <div className="sticky bottom-4 bg-white/90 backdrop-blur-sm border border-neutral-200 rounded-lg shadow-lg px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-neutral-500">
          <AutoSaveIndicator status={autoSaveStatus} onRetry={() => void saveNow()} />
          <span>Los cambios se autoguardan; el sitio se actualiza en &lt; 1 min.</span>
        </div>
        <Button
          onClick={onForceSave}
          disabled={isPending || autoSaveStatus === "saving"}
          variant="secondary"
          size="sm"
        >
          <Save className="w-4 h-4" />
          {isPending ? "Guardando…" : "Forzar guardado"}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SortableModule — envuelve cada módulo de la pestaña con su agarradera de
// arrastre (grip a la izquierda, en su propio canalón). Sólo el grip lleva los
// listeners de dnd-kit, así que los inputs / editores de adentro siguen
// funcionando normal: arrastrar arranca únicamente desde el ícono. Cuando el
// usuario no puede editar, no se muestra el grip y el módulo ocupa todo el ancho.
// ---------------------------------------------------------------------------
function SortableModule({
  id,
  label,
  draggable,
  children,
}: {
  id: string;
  label: string;
  draggable: boolean;
  children: React.ReactNode;
}) {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !draggable });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 30 : undefined,
    opacity: isDragging ? 0.85 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-stretch gap-2">
      {draggable && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Arrastrar módulo ${label} para reordenar`}
          title="Arrastrar para reordenar"
          className="shrink-0 flex w-6 items-center justify-center rounded-md text-neutral-300 hover:bg-neutral-100 hover:text-neutral-500 cursor-grab active:cursor-grabbing touch-none"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
