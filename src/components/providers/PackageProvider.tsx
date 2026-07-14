"use client";

import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useMemo,
  useState,
  useRef,
  type Dispatch,
} from "react";
import type {
  Paquete,
  PaqueteAereo,
  PaqueteAlojamiento,
  PaqueteTraslado,
  PaqueteSeguro,
  PaqueteCircuito,
  PaqueteFoto,
  PaqueteEtiqueta,
  OpcionHotelera,
  PaqueteDestino,
  OpcionHotel,
} from "@/lib/types";
import { computeNochesTotales } from "@/lib/utils";
import { useSession } from "next-auth/react";
import * as packageActions from "@/actions/package.actions";
import { useBrand } from "./BrandProvider";
import { readSessionCache, writeSessionCache } from "@/lib/session-cache";

// Session-cache TTL: 30 min. Long enough to make hard reloads instant during
// a working session, short enough that someone returning after a coffee gets
// fresh data instead of a stale snapshot.
const SESSION_CACHE_TTL_MS = 30 * 60 * 1000;

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
interface PackageState {
  loading: boolean;
  hydratingPaquetes: boolean;
  totalPaquetes: number;
  paquetes: Paquete[];
  paqueteAereos: PaqueteAereo[];
  paqueteAlojamientos: PaqueteAlojamiento[];
  paqueteTraslados: PaqueteTraslado[];
  paqueteSeguros: PaqueteSeguro[];
  paqueteCircuitos: PaqueteCircuito[];
  paqueteFotos: PaqueteFoto[];
  paqueteEtiquetas: PaqueteEtiqueta[];
  opcionesHoteleras: OpcionHotelera[];
  destinos: PaqueteDestino[];
  opcionHoteles: OpcionHotel[];
}

const initialState: PackageState = {
  loading: true,
  hydratingPaquetes: false,
  totalPaquetes: 0,
  paquetes: [],
  paqueteAereos: [],
  paqueteAlojamientos: [],
  paqueteTraslados: [],
  paqueteSeguros: [],
  paqueteCircuitos: [],
  paqueteFotos: [],
  paqueteEtiquetas: [],
  opcionesHoteleras: [],
  destinos: [],
  opcionHoteles: [],
};

// Inflight server actions reject with `TypeError: Failed to fetch` when the
// page unloads mid-navigation. That's expected — silence it so the console
// only surfaces real failures.
function isAbortError(err: unknown): boolean {
  if (!err) return false;
  if (err instanceof DOMException && err.name === "AbortError") return true;
  const msg = err instanceof Error ? err.message : String(err);
  return /Failed to fetch|aborted|NetworkError when attempting/i.test(msg);
}

function sortPaquetesByCreatedAtDesc(paquetes: Paquete[]): Paquete[] {
  return [...paquetes].sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bTime - aTime;
  });
}

// ---------------------------------------------------------------------------
// Actions (discriminated union)
// ---------------------------------------------------------------------------
type PackageSubPayload = {
  paqueteAereos: PaqueteAereo[];
  paqueteAlojamientos: PaqueteAlojamiento[];
  paqueteTraslados: PaqueteTraslado[];
  paqueteSeguros: PaqueteSeguro[];
  paqueteCircuitos: PaqueteCircuito[];
  paqueteFotos: PaqueteFoto[];
  paqueteEtiquetas: PaqueteEtiqueta[];
  opcionesHoteleras: OpcionHotelera[];
  destinos: PaqueteDestino[];
  opcionHoteles: OpcionHotel[];
};

type PackageAction =
  | { type: "SET_ALL"; payload: PackageState }
  | { type: "MERGE_SUB_ENTITIES"; payload: PackageSubPayload }
  | {
      type: "APPEND_PAQUETES";
      payload: { paquetes: Paquete[]; totalPaquetes: number };
    }
  // Paquete (soft delete)
  | { type: "ADD_PAQUETE"; payload: Paquete }
  | { type: "UPDATE_PAQUETE"; payload: Paquete }
  | { type: "DELETE_PAQUETE"; payload: string }
  | { type: "CLONE_PAQUETE"; payload: string }
  // PaqueteAereo (hard delete)
  | { type: "ADD_PAQUETE_AEREO"; payload: PaqueteAereo }
  | { type: "UPDATE_PAQUETE_AEREO"; payload: PaqueteAereo }
  | { type: "DELETE_PAQUETE_AEREO"; payload: string }
  // PaqueteAlojamiento (hard delete)
  | { type: "ADD_PAQUETE_ALOJAMIENTO"; payload: PaqueteAlojamiento }
  | { type: "UPDATE_PAQUETE_ALOJAMIENTO"; payload: PaqueteAlojamiento }
  | { type: "DELETE_PAQUETE_ALOJAMIENTO"; payload: string }
  // PaqueteTraslado (hard delete)
  | { type: "ADD_PAQUETE_TRASLADO"; payload: PaqueteTraslado }
  | { type: "UPDATE_PAQUETE_TRASLADO"; payload: PaqueteTraslado }
  | { type: "DELETE_PAQUETE_TRASLADO"; payload: string }
  // PaqueteSeguro (hard delete)
  | { type: "ADD_PAQUETE_SEGURO"; payload: PaqueteSeguro }
  | { type: "UPDATE_PAQUETE_SEGURO"; payload: PaqueteSeguro }
  | { type: "DELETE_PAQUETE_SEGURO"; payload: string }
  // PaqueteCircuito (hard delete)
  | { type: "ADD_PAQUETE_CIRCUITO"; payload: PaqueteCircuito }
  | { type: "UPDATE_PAQUETE_CIRCUITO"; payload: PaqueteCircuito }
  | { type: "DELETE_PAQUETE_CIRCUITO"; payload: string }
  // PaqueteFoto (hard delete)
  | { type: "ADD_PAQUETE_FOTO"; payload: PaqueteFoto }
  | { type: "UPDATE_PAQUETE_FOTO"; payload: PaqueteFoto }
  | { type: "DELETE_PAQUETE_FOTO"; payload: string }
  // PaqueteEtiqueta (hard delete)
  | { type: "ADD_PAQUETE_ETIQUETA"; payload: PaqueteEtiqueta }
  | { type: "DELETE_PAQUETE_ETIQUETA"; payload: string }
  // OpcionHotelera (hard delete)
  | { type: "ADD_OPCION_HOTELERA"; payload: OpcionHotelera }
  | { type: "UPDATE_OPCION_HOTELERA"; payload: OpcionHotelera }
  | { type: "DELETE_OPCION_HOTELERA"; payload: string }
  // PaqueteDestino (hard delete)
  | { type: "ADD_DESTINO"; payload: PaqueteDestino }
  | { type: "UPDATE_DESTINO"; payload: PaqueteDestino }
  | { type: "DELETE_DESTINO"; payload: string }
  | { type: "REORDER_DESTINOS"; payload: { paqueteId: string; orderedIds: string[] } }
  | {
      type: "REORDER_ASSIGNMENTS";
      payload: {
        type: "aereos" | "traslados" | "seguros" | "circuitos";
        orderedIds: string[];
      };
    }
  // OpcionHotel (hard delete)
  | { type: "ADD_OPCION_HOTEL"; payload: OpcionHotel }
  | { type: "UPDATE_OPCION_HOTEL"; payload: OpcionHotel }
  | { type: "DELETE_OPCION_HOTEL"; payload: string };

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------
function packageReducer(state: PackageState, action: PackageAction): PackageState {
  switch (action.type) {
    case "SET_ALL":
      return action.payload;
    case "MERGE_SUB_ENTITIES":
      return { ...state, ...action.payload };
    case "APPEND_PAQUETES": {
      const merged = new Map(state.paquetes.map((item) => [item.id, item]));
      for (const paquete of action.payload.paquetes) {
        merged.set(paquete.id, paquete);
      }
      return {
        ...state,
        hydratingPaquetes: false,
        totalPaquetes: action.payload.totalPaquetes,
        paquetes: sortPaquetesByCreatedAtDesc(Array.from(merged.values())),
      };
    }

    // -- Paquete (soft delete) --
    case "ADD_PAQUETE":
      return {
        ...state,
        totalPaquetes: state.totalPaquetes + 1,
        paquetes: sortPaquetesByCreatedAtDesc([
          action.payload,
          ...state.paquetes,
        ]),
      };
    case "UPDATE_PAQUETE":
      return {
        ...state,
        paquetes: state.paquetes.map((p) =>
          p.id === action.payload.id ? action.payload : p,
        ),
      };
    case "DELETE_PAQUETE":
      return {
        ...state,
        totalPaquetes: Math.max(0, state.totalPaquetes - 1),
        paquetes: state.paquetes.map((p) =>
          p.id === action.payload
            ? { ...p, deletedAt: new Date().toISOString() }
            : p,
        ),
      };

    // -- CLONE_PAQUETE --
    case "CLONE_PAQUETE": {
      const source = state.paquetes.find((p) => p.id === action.payload);
      if (!source) return state;
      const newId = crypto.randomUUID();
      const now = new Date().toISOString();
      const cloned: Paquete = {
        ...source,
        id: newId,
        titulo: `Copia de ${source.titulo}`,
        estado: "BORRADOR",
        destacado: false,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };
      const clonedAereos = state.paqueteAereos
        .filter((pa) => pa.paqueteId === source.id)
        .map((pa) => ({ ...pa, id: crypto.randomUUID(), paqueteId: newId }));
      const clonedAlojamientos = state.paqueteAlojamientos
        .filter((pa) => pa.paqueteId === source.id)
        .map((pa) => ({ ...pa, id: crypto.randomUUID(), paqueteId: newId }));
      const clonedTraslados = state.paqueteTraslados
        .filter((pt) => pt.paqueteId === source.id)
        .map((pt) => ({ ...pt, id: crypto.randomUUID(), paqueteId: newId }));
      const clonedSeguros = state.paqueteSeguros
        .filter((ps) => ps.paqueteId === source.id)
        .map((ps) => ({ ...ps, id: crypto.randomUUID(), paqueteId: newId }));
      const clonedCircuitos = state.paqueteCircuitos
        .filter((pc) => pc.paqueteId === source.id)
        .map((pc) => ({ ...pc, id: crypto.randomUUID(), paqueteId: newId }));
      const clonedFotos = state.paqueteFotos
        .filter((pf) => pf.paqueteId === source.id)
        .map((pf) => ({ ...pf, id: crypto.randomUUID(), paqueteId: newId }));
      const clonedEtiquetas = state.paqueteEtiquetas
        .filter((pe) => pe.paqueteId === source.id)
        .map((pe) => ({ ...pe, id: crypto.randomUUID(), paqueteId: newId }));
      const clonedOpciones = state.opcionesHoteleras
        .filter((o) => o.paqueteId === source.id)
        .map((o) => ({ ...o, id: crypto.randomUUID(), paqueteId: newId }));
      return {
        ...state,
        totalPaquetes: state.totalPaquetes + 1,
        paquetes: sortPaquetesByCreatedAtDesc([cloned, ...state.paquetes]),
        paqueteAereos: [...state.paqueteAereos, ...clonedAereos],
        paqueteAlojamientos: [...state.paqueteAlojamientos, ...clonedAlojamientos],
        paqueteTraslados: [...state.paqueteTraslados, ...clonedTraslados],
        paqueteSeguros: [...state.paqueteSeguros, ...clonedSeguros],
        paqueteCircuitos: [...state.paqueteCircuitos, ...clonedCircuitos],
        paqueteFotos: [...state.paqueteFotos, ...clonedFotos],
        paqueteEtiquetas: [...state.paqueteEtiquetas, ...clonedEtiquetas],
        opcionesHoteleras: [...state.opcionesHoteleras, ...clonedOpciones],
      };
    }

    // -- PaqueteAereo (hard delete) --
    case "ADD_PAQUETE_AEREO":
      return { ...state, paqueteAereos: [...state.paqueteAereos, action.payload] };
    case "UPDATE_PAQUETE_AEREO":
      return {
        ...state,
        paqueteAereos: state.paqueteAereos.map((e) =>
          e.id === action.payload.id ? action.payload : e,
        ),
      };
    case "DELETE_PAQUETE_AEREO":
      return {
        ...state,
        paqueteAereos: state.paqueteAereos.filter((e) => e.id !== action.payload),
      };

    // -- PaqueteAlojamiento (hard delete) --
    case "ADD_PAQUETE_ALOJAMIENTO":
      return {
        ...state,
        paqueteAlojamientos: [...state.paqueteAlojamientos, action.payload],
      };
    case "UPDATE_PAQUETE_ALOJAMIENTO":
      return {
        ...state,
        paqueteAlojamientos: state.paqueteAlojamientos.map((e) =>
          e.id === action.payload.id ? action.payload : e,
        ),
      };
    case "DELETE_PAQUETE_ALOJAMIENTO":
      return {
        ...state,
        paqueteAlojamientos: state.paqueteAlojamientos.filter(
          (e) => e.id !== action.payload,
        ),
      };

    // -- PaqueteTraslado (hard delete) --
    case "ADD_PAQUETE_TRASLADO":
      return {
        ...state,
        paqueteTraslados: [...state.paqueteTraslados, action.payload],
      };
    case "UPDATE_PAQUETE_TRASLADO":
      return {
        ...state,
        paqueteTraslados: state.paqueteTraslados.map((e) =>
          e.id === action.payload.id ? action.payload : e,
        ),
      };
    case "DELETE_PAQUETE_TRASLADO":
      return {
        ...state,
        paqueteTraslados: state.paqueteTraslados.filter(
          (e) => e.id !== action.payload,
        ),
      };

    // -- PaqueteSeguro (hard delete) --
    case "ADD_PAQUETE_SEGURO":
      return {
        ...state,
        paqueteSeguros: [...state.paqueteSeguros, action.payload],
      };
    case "UPDATE_PAQUETE_SEGURO":
      return {
        ...state,
        paqueteSeguros: state.paqueteSeguros.map((e) =>
          e.id === action.payload.id ? action.payload : e,
        ),
      };
    case "DELETE_PAQUETE_SEGURO":
      return {
        ...state,
        paqueteSeguros: state.paqueteSeguros.filter(
          (e) => e.id !== action.payload,
        ),
      };

    // -- PaqueteCircuito (hard delete) --
    case "ADD_PAQUETE_CIRCUITO":
      return {
        ...state,
        paqueteCircuitos: [...state.paqueteCircuitos, action.payload],
      };
    case "UPDATE_PAQUETE_CIRCUITO":
      return {
        ...state,
        paqueteCircuitos: state.paqueteCircuitos.map((e) =>
          e.id === action.payload.id ? action.payload : e,
        ),
      };
    case "DELETE_PAQUETE_CIRCUITO":
      return {
        ...state,
        paqueteCircuitos: state.paqueteCircuitos.filter(
          (e) => e.id !== action.payload,
        ),
      };

    // -- PaqueteFoto (hard delete) --
    case "ADD_PAQUETE_FOTO":
      return { ...state, paqueteFotos: [...state.paqueteFotos, action.payload] };
    case "UPDATE_PAQUETE_FOTO":
      return {
        ...state,
        paqueteFotos: state.paqueteFotos.map((e) =>
          e.id === action.payload.id ? action.payload : e,
        ),
      };
    case "DELETE_PAQUETE_FOTO":
      return {
        ...state,
        paqueteFotos: state.paqueteFotos.filter((e) => e.id !== action.payload),
      };

    // -- PaqueteEtiqueta (hard delete) --
    case "ADD_PAQUETE_ETIQUETA":
      return {
        ...state,
        paqueteEtiquetas: [...state.paqueteEtiquetas, action.payload],
      };
    case "DELETE_PAQUETE_ETIQUETA":
      return {
        ...state,
        paqueteEtiquetas: state.paqueteEtiquetas.filter(
          (e) => e.id !== action.payload,
        ),
      };

    // -- OpcionHotelera (hard delete) --
    case "ADD_OPCION_HOTELERA":
      return {
        ...state,
        opcionesHoteleras: [...state.opcionesHoteleras, action.payload],
      };
    case "UPDATE_OPCION_HOTELERA":
      return {
        ...state,
        opcionesHoteleras: state.opcionesHoteleras.map((o) =>
          o.id === action.payload.id ? action.payload : o,
        ),
      };
    case "DELETE_OPCION_HOTELERA":
      return {
        ...state,
        opcionesHoteleras: state.opcionesHoteleras.filter(
          (o) => o.id !== action.payload,
        ),
      };

    // -- PaqueteDestino --
    case "ADD_DESTINO":
      return { ...state, destinos: [...state.destinos, action.payload] };
    case "UPDATE_DESTINO":
      return {
        ...state,
        destinos: state.destinos.map((d) =>
          d.id === action.payload.id ? action.payload : d,
        ),
      };
    case "DELETE_DESTINO":
      return {
        ...state,
        destinos: state.destinos.filter((d) => d.id !== action.payload),
        // Also drop any OpcionHotel that referenced this destino —
        // the DB cascade takes care of the row, this mirrors it in state.
        opcionHoteles: state.opcionHoteles.filter(
          (oh) => oh.destinoId !== action.payload,
        ),
      };
    case "REORDER_DESTINOS": {
      const { paqueteId, orderedIds } = action.payload;
      const orderMap = new Map(orderedIds.map((id, idx) => [id, idx]));
      return {
        ...state,
        destinos: state.destinos.map((d) =>
          d.paqueteId === paqueteId && orderMap.has(d.id)
            ? { ...d, orden: orderMap.get(d.id)! }
            : d,
        ),
      };
    }
    case "REORDER_ASSIGNMENTS": {
      const { type, orderedIds } = action.payload;
      const orderMap = new Map(orderedIds.map((id, idx) => [id, idx]));
      const sliceKey = (
        {
          aereos: "paqueteAereos",
          traslados: "paqueteTraslados",
          seguros: "paqueteSeguros",
          circuitos: "paqueteCircuitos",
        } as const
      )[type];
      return {
        ...state,
        [sliceKey]: (state[sliceKey] as Array<{ id: string; orden: number }>).map(
          (row) =>
            orderMap.has(row.id)
              ? { ...row, orden: orderMap.get(row.id)! }
              : row,
        ),
      };
    }

    // -- OpcionHotel --
    case "ADD_OPCION_HOTEL": {
      // Upsert semantics: replace if id already exists (happens when the
      // server action returns an update of an existing row).
      const exists = state.opcionHoteles.some(
        (oh) => oh.id === action.payload.id,
      );
      return {
        ...state,
        opcionHoteles: exists
          ? state.opcionHoteles.map((oh) =>
              oh.id === action.payload.id ? action.payload : oh,
            )
          : [...state.opcionHoteles, action.payload],
      };
    }
    case "UPDATE_OPCION_HOTEL":
      return {
        ...state,
        opcionHoteles: state.opcionHoteles.map((oh) =>
          oh.id === action.payload.id ? action.payload : oh,
        ),
      };
    case "DELETE_OPCION_HOTEL":
      return {
        ...state,
        opcionHoteles: state.opcionHoteles.filter(
          (oh) => oh.id !== action.payload,
        ),
      };

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Contexts (split state / dispatch)
// ---------------------------------------------------------------------------
const PackageStateContext = createContext<PackageState | null>(null);
const PackageDispatchContext = createContext<Dispatch<PackageAction> | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export function PackageProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(packageReducer, initialState);
  const { activeBrandId } = useBrand();
  const { status: sessionStatus } = useSession();
  const INITIAL_PAQUETES_CHUNK = 18;

  // Refetch al volver el foco a la pestaña (ver nota en ServiceProvider): con
  // varias personas/pestañas editando, los datos cargados al montar quedan
  // viejos. Recargamos cuando la pestaña vuelve a primer plano, con throttle.
  const [refreshNonce, setRefreshNonce] = useState(0);
  const lastLoadRef = useRef(0);
  const REFRESH_MIN_INTERVAL_MS = 15_000;
  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    const maybeRefresh = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastLoadRef.current < REFRESH_MIN_INTERVAL_MS) return;
      setRefreshNonce((n) => n + 1);
    };
    window.addEventListener("focus", maybeRefresh);
    document.addEventListener("visibilitychange", maybeRefresh);
    return () => {
      window.removeEventListener("focus", maybeRefresh);
      document.removeEventListener("visibilitychange", maybeRefresh);
    };
  }, [sessionStatus]);

  useEffect(() => {
    let cancelled = false;

    // If not authenticated, reset state but keep loading: true so that when
    // the user logs in, admin pages show skeleton until the authenticated
    // fetch completes (prevents the empty-state flash during re-auth).
    if (sessionStatus !== "authenticated") {
      if (sessionStatus === "unauthenticated") {
        dispatch({ type: "SET_ALL", payload: initialState });
      }
      return;
    }

    // Try the per-tab session cache first. If we find a fresh snapshot for
    // this brand, hydrate from it synchronously so the very first render
    // after a hard reload is instant. We still revalidate in the background.
    const cached = readSessionCache<PackageState>(
      "package-state",
      activeBrandId,
      SESSION_CACHE_TTL_MS,
    );

    // Stale-while-revalidate: prefer cached, then in-memory, then loading.
    const baseline = cached ?? state;
    dispatch({
      type: "SET_ALL",
      payload: {
        ...baseline,
        loading: baseline.paquetes.length === 0,
        hydratingPaquetes: baseline.paquetes.length > 0,
      },
    });

    // Wave 1 — only Paquete rows. Fast (<1 s). Lifts skeleton & shows list.
    packageActions
      .getBasePackages(activeBrandId, { take: INITIAL_PAQUETES_CHUNK })
      .then((base) => {
        if (cancelled) return;
        lastLoadRef.current = Date.now();
        dispatch({
          type: "SET_ALL",
          payload: {
            ...initialState,
            loading: false,
            hydratingPaquetes:
              (base.total ?? base.paquetes.length) > base.paquetes.length,
            totalPaquetes: base.total ?? base.paquetes.length,
            paquetes: base.paquetes as any,
          },
        });

        const shouldHydrateMore = (base.total ?? 0) > base.paquetes.length;

        if (!shouldHydrateMore) return;

        packageActions
          .getBasePackages(activeBrandId, {
            skip: base.paquetes.length,
          })
          .then((remaining) => {
            if (cancelled) return;
            dispatch({
              type: "APPEND_PAQUETES",
              payload: {
                paquetes: remaining.paquetes as any,
                totalPaquetes: remaining.total,
              },
            });
          })
          .catch((err) => {
            if (cancelled || isAbortError(err)) return;
            console.error("Error hydrating remaining packages:", err);
            dispatch({
              type: "APPEND_PAQUETES",
              payload: {
                paquetes: [],
                totalPaquetes: base.total ?? base.paquetes.length,
              },
            });
          });
      })
      .catch((err) => {
        if (cancelled || isAbortError(err)) return;
        console.error("Error fetching base packages:", err);
        dispatch({ type: "SET_ALL", payload: { ...initialState, loading: false } });
      });

    // Wave 2 — all paquete-X join tables. Heavier but non-blocking.
    packageActions
      .getPackageSubEntities(activeBrandId)
      .then((sub) => {
        if (cancelled) return;
        dispatch({
          type: "MERGE_SUB_ENTITIES",
          payload: {
            paqueteAereos: sub.paqueteAereos as any,
            paqueteAlojamientos: sub.paqueteAlojamientos as any,
            paqueteTraslados: sub.paqueteTraslados as any,
            paqueteSeguros: sub.paqueteSeguros as any,
            paqueteCircuitos: sub.paqueteCircuitos as any,
            paqueteFotos: sub.paqueteFotos as any,
            paqueteEtiquetas: sub.paqueteEtiquetas as any,
            opcionesHoteleras: sub.opcionesHoteleras as any,
            destinos: (sub.destinos ?? []) as any,
            opcionHoteles: (sub.opcionHoteles ?? []) as any,
          },
        });
      })
      .catch((err) => {
        console.error("Error fetching package sub-entities:", err);
        // Non-fatal: base paquetes list from wave 1 is already visible.
      });

    return () => { cancelled = true; };
  }, [activeBrandId, sessionStatus, refreshNonce]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist to sessionStorage whenever the state changes — but only after
  // wave 2 has populated (so we don't snapshot a half-loaded state). The
  // 800 ms debounce coalesces the burst of dispatches that fire during
  // hydration and during bulk edits into one write per quiet period.
  useEffect(() => {
    if (state.loading) return;
    if (sessionStatus !== "authenticated") return;
    const handle = window.setTimeout(() => {
      writeSessionCache("package-state", activeBrandId, state);
    }, 800);
    return () => window.clearTimeout(handle);
  }, [state, activeBrandId, sessionStatus]);

  return (
    <PackageStateContext.Provider value={state}>
      <PackageDispatchContext.Provider value={dispatch}>
        {children}
      </PackageDispatchContext.Provider>
    </PackageStateContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Raw state / dispatch hooks
// ---------------------------------------------------------------------------
export function usePackageState(): PackageState {
  const ctx = useContext(PackageStateContext);
  if (!ctx) {
    throw new Error("usePackageState must be used within a <PackageProvider>");
  }
  return ctx;
}

export function usePackageDispatch(): Dispatch<PackageAction> {
  const ctx = useContext(PackageDispatchContext);
  if (!ctx) {
    throw new Error("usePackageDispatch must be used within a <PackageProvider>");
  }
  return ctx;
}

export function usePackageLoading(): boolean {
  return usePackageState().loading;
}

export function usePackageProgress() {
  const state = usePackageState();
  return useMemo(
    () => ({
      hydratingPaquetes: state.hydratingPaquetes,
      totalPaquetes: state.totalPaquetes,
      loadedPaquetes: state.paquetes.length,
    }),
    [state.hydratingPaquetes, state.totalPaquetes, state.paquetes.length],
  );
}

// ---------------------------------------------------------------------------
// Brand-filtered selector hooks
// ---------------------------------------------------------------------------

export function usePaquetes(): Paquete[] {
  const { activeBrandId } = useBrand();
  const state = usePackageState();
  return useMemo(
    () =>
      sortPaquetesByCreatedAtDesc(
        state.paquetes.filter(
          (p) => p.brandId === activeBrandId && !p.deletedAt,
        ),
      ),
    [state.paquetes, activeBrandId],
  );
}

export function usePaqueteById(id: string): Paquete | undefined {
  const state = usePackageState();
  return useMemo(
    () => state.paquetes.find((p) => p.id === id && !p.deletedAt),
    [state.paquetes, id],
  );
}

// ---------------------------------------------------------------------------
// CRUD + clone + assign action hook
// ---------------------------------------------------------------------------
export function usePackageActions() {
  const dispatch = usePackageDispatch();

  return useMemo(
    () => ({
      // -- Paquete CRUD --
      createPaquete: async (
        data: {
          brandId: string;
          titulo: string;
          destino: string;
          descripcion?: string;
          textoVisual?: string | null;
          salidas?: string;
          noches?: number;
          temporadaId?: string;
          tipoPaqueteId?: string;
          estado?: Paquete["estado"];
          modalidad?: Paquete["modalidad"];
          destacado?: boolean;
          netoCalculado?: number;
          markup?: number;
          precioVenta?: number;
          moneda?: string;
          validezDesde?: string;
          validezHasta?: string;
          ordenServicios?: string[];
        },
      ) => {
        const entity = await packageActions.createPaquete(data as any);
        dispatch({ type: "ADD_PAQUETE", payload: entity as any });
        return entity as any;
      },
      updatePaquete: async (paquete: Paquete) => {
        const res = await packageActions.updatePaquete(paquete.id, paquete as any);
        // Gate del invariante estado ACTIVO ⇔ publicado: si el server bloqueó la
        // transición a ACTIVO, el estado en DB sigue siendo el anterior. No
        // aplicamos el cambio optimista y devolvemos el resultado para que el
        // caller (DatosTab) revierta el select y muestre los faltantes.
        if (res && (res as { ok?: boolean }).ok === false) {
          return res as { ok: false; reason: string; missing: string[] };
        }
        // Invariante estado ACTIVO ⇔ publicado: alineamos `publicado` con el
        // estado en el payload optimista para que la caché no muestre un
        // publicado stale hasta la próxima lectura del server.
        dispatch({
          type: "UPDATE_PAQUETE",
          payload: { ...paquete, publicado: paquete.estado === "ACTIVO" },
        });
        return res as { ok: true };
      },
      deletePaquete: async (id: string) => {
        await packageActions.deletePaquete(id);
        dispatch({ type: "DELETE_PAQUETE", payload: id });
      },
      clonePaquete: async (id: string) => {
        const result = await packageActions.clonePaquete(id);
        dispatch({ type: "ADD_PAQUETE", payload: result.paquete as any });
        for (const r of result.paqueteAereos) dispatch({ type: "ADD_PAQUETE_AEREO", payload: r as any });
        for (const r of result.paqueteAlojamientos) dispatch({ type: "ADD_PAQUETE_ALOJAMIENTO", payload: r as any });
        for (const r of result.paqueteTraslados) dispatch({ type: "ADD_PAQUETE_TRASLADO", payload: r as any });
        for (const r of result.paqueteSeguros) dispatch({ type: "ADD_PAQUETE_SEGURO", payload: r as any });
        for (const r of result.paqueteCircuitos) dispatch({ type: "ADD_PAQUETE_CIRCUITO", payload: r as any });
        for (const r of result.paqueteFotos) dispatch({ type: "ADD_PAQUETE_FOTO", payload: r as any });
        for (const r of result.paqueteEtiquetas) dispatch({ type: "ADD_PAQUETE_ETIQUETA", payload: r as any });
        for (const r of result.opcionesHoteleras) dispatch({ type: "ADD_OPCION_HOTELERA", payload: r as any });
        for (const r of (result.destinos ?? [])) dispatch({ type: "ADD_DESTINO", payload: r as any });
        for (const r of (result.opcionHoteles ?? [])) dispatch({ type: "ADD_OPCION_HOTEL", payload: r as any });
      },

      // -- Aereo assignment --
      // Optimistic: insert a tmp row, swap for real on success, rollback on
      // error. Lets the Servicios tab + the modal's "available" filter update
      // before the server roundtrip — closes the window where a fast operator
      // could double-click and hit a unique-constraint 500.
      assignAereo: async (data: Omit<PaqueteAereo, "id">) => {
        const tmpId = `tmp-${crypto.randomUUID()}`;
        dispatch({
          type: "ADD_PAQUETE_AEREO",
          payload: { id: tmpId, ...data } as PaqueteAereo,
        });
        try {
          const entity = await packageActions.assignAereo(data as any);
          dispatch({ type: "DELETE_PAQUETE_AEREO", payload: tmpId });
          dispatch({ type: "ADD_PAQUETE_AEREO", payload: entity as any });
          return entity as any;
        } catch (e) {
          dispatch({ type: "DELETE_PAQUETE_AEREO", payload: tmpId });
          throw e;
        }
      },
      removeAereo: async (id: string) => {
        await packageActions.removeAereo(id);
        dispatch({ type: "DELETE_PAQUETE_AEREO", payload: id });
      },
      updateAereoAssignment: async (assignment: PaqueteAereo) => {
        await packageActions.updateAereoAssignment(assignment.id, assignment as any);
        dispatch({ type: "UPDATE_PAQUETE_AEREO", payload: assignment });
      },

      // -- Alojamiento assignment --
      assignAlojamiento: async (data: Omit<PaqueteAlojamiento, "id">) => {
        const tmpId = `tmp-${crypto.randomUUID()}`;
        dispatch({
          type: "ADD_PAQUETE_ALOJAMIENTO",
          payload: { id: tmpId, ...data } as PaqueteAlojamiento,
        });
        try {
          const entity = await packageActions.assignAlojamiento(data as any);
          dispatch({ type: "DELETE_PAQUETE_ALOJAMIENTO", payload: tmpId });
          dispatch({ type: "ADD_PAQUETE_ALOJAMIENTO", payload: entity as any });
          return entity as any;
        } catch (e) {
          dispatch({ type: "DELETE_PAQUETE_ALOJAMIENTO", payload: tmpId });
          throw e;
        }
      },
      removeAlojamiento: async (id: string) => {
        await packageActions.removeAlojamiento(id);
        dispatch({ type: "DELETE_PAQUETE_ALOJAMIENTO", payload: id });
      },
      updateAlojamientoAssignment: async (assignment: PaqueteAlojamiento) => {
        await packageActions.updateAlojamientoAssignment(assignment.id, assignment as any);
        dispatch({ type: "UPDATE_PAQUETE_ALOJAMIENTO", payload: assignment });
      },

      // -- Traslado assignment --
      assignTraslado: async (data: Omit<PaqueteTraslado, "id">) => {
        const tmpId = `tmp-${crypto.randomUUID()}`;
        dispatch({
          type: "ADD_PAQUETE_TRASLADO",
          payload: { id: tmpId, ...data } as PaqueteTraslado,
        });
        try {
          const entity = await packageActions.assignTraslado(data as any);
          dispatch({ type: "DELETE_PAQUETE_TRASLADO", payload: tmpId });
          dispatch({ type: "ADD_PAQUETE_TRASLADO", payload: entity as any });
          return entity as any;
        } catch (e) {
          dispatch({ type: "DELETE_PAQUETE_TRASLADO", payload: tmpId });
          throw e;
        }
      },
      removeTraslado: async (id: string) => {
        await packageActions.removeTraslado(id);
        dispatch({ type: "DELETE_PAQUETE_TRASLADO", payload: id });
      },
      updateTrasladoAssignment: async (assignment: PaqueteTraslado) => {
        await packageActions.updateTrasladoAssignment(assignment.id, assignment as any);
        dispatch({ type: "UPDATE_PAQUETE_TRASLADO", payload: assignment });
      },

      // -- Seguro assignment --
      assignSeguro: async (data: Omit<PaqueteSeguro, "id">) => {
        const tmpId = `tmp-${crypto.randomUUID()}`;
        dispatch({
          type: "ADD_PAQUETE_SEGURO",
          payload: { id: tmpId, ...data } as PaqueteSeguro,
        });
        try {
          const entity = await packageActions.assignSeguro(data as any);
          dispatch({ type: "DELETE_PAQUETE_SEGURO", payload: tmpId });
          dispatch({ type: "ADD_PAQUETE_SEGURO", payload: entity as any });
          return entity as any;
        } catch (e) {
          dispatch({ type: "DELETE_PAQUETE_SEGURO", payload: tmpId });
          throw e;
        }
      },
      removeSeguro: async (id: string) => {
        await packageActions.removeSeguro(id);
        dispatch({ type: "DELETE_PAQUETE_SEGURO", payload: id });
      },
      updateSeguroAssignment: async (assignment: PaqueteSeguro) => {
        await packageActions.updateSeguroAssignment(assignment.id, assignment as any);
        dispatch({ type: "UPDATE_PAQUETE_SEGURO", payload: assignment });
      },

      // -- Circuito assignment --
      assignCircuito: async (data: Omit<PaqueteCircuito, "id">) => {
        const tmpId = `tmp-${crypto.randomUUID()}`;
        dispatch({
          type: "ADD_PAQUETE_CIRCUITO",
          payload: { id: tmpId, ...data } as PaqueteCircuito,
        });
        try {
          const entity = await packageActions.assignCircuito(data as any);
          dispatch({ type: "DELETE_PAQUETE_CIRCUITO", payload: tmpId });
          dispatch({ type: "ADD_PAQUETE_CIRCUITO", payload: entity as any });
          return entity as any;
        } catch (e) {
          dispatch({ type: "DELETE_PAQUETE_CIRCUITO", payload: tmpId });
          throw e;
        }
      },
      removeCircuito: async (id: string) => {
        await packageActions.removeCircuito(id);
        dispatch({ type: "DELETE_PAQUETE_CIRCUITO", payload: id });
      },
      updateCircuitoAssignment: async (assignment: PaqueteCircuito) => {
        await packageActions.updateCircuitoAssignment(assignment.id, assignment as any);
        dispatch({ type: "UPDATE_PAQUETE_CIRCUITO", payload: assignment });
      },

      // -- Bulk reorder for the Servicios tab drag-and-drop --
      reorderAssignments: async (
        type: "aereos" | "traslados" | "seguros" | "circuitos",
        orderedIds: string[],
      ) => {
        await packageActions.reorderPaqueteAssignments(type, orderedIds);
        dispatch({
          type: "REORDER_ASSIGNMENTS",
          payload: { type, orderedIds },
        });
      },

      // -- Photo management --
      addFoto: async (data: Omit<PaqueteFoto, "id">) => {
        const entity = await packageActions.addPaqueteFoto(data);
        dispatch({ type: "ADD_PAQUETE_FOTO", payload: entity as any });
        return entity as any;
      },
      removeFoto: async (id: string) => {
        await packageActions.removePaqueteFoto(id);
        dispatch({ type: "DELETE_PAQUETE_FOTO", payload: id });
      },
      updateFoto: async (foto: PaqueteFoto) => {
        await packageActions.updatePaqueteFoto(foto.id, foto);
        dispatch({ type: "UPDATE_PAQUETE_FOTO", payload: foto });
      },

      // -- Etiqueta assignment --
      assignEtiqueta: async (data: Omit<PaqueteEtiqueta, "id">) => {
        const entity = await packageActions.assignEtiqueta(data);
        dispatch({ type: "ADD_PAQUETE_ETIQUETA", payload: entity as any });
        return entity as any;
      },
      removeEtiqueta: async (id: string) => {
        await packageActions.removeEtiqueta(id);
        dispatch({ type: "DELETE_PAQUETE_ETIQUETA", payload: id });
      },

      // -- OpcionHotelera CRUD --
      createOpcionHotelera: async (data: Omit<OpcionHotelera, "id">) => {
        const entity = await packageActions.createOpcionHotelera(data);
        dispatch({ type: "ADD_OPCION_HOTELERA", payload: entity as any });
        return entity as any;
      },
      updateOpcionHotelera: async (opcion: OpcionHotelera) => {
        await packageActions.updateOpcionHotelera(opcion.id, opcion);
        dispatch({ type: "UPDATE_OPCION_HOTELERA", payload: opcion });
      },
      deleteOpcionHotelera: async (id: string) => {
        await packageActions.deleteOpcionHotelera(id);
        dispatch({ type: "DELETE_OPCION_HOTELERA", payload: id });
      },

      // -- PaqueteDestino CRUD --
      createDestino: async (data: Omit<PaqueteDestino, "id">) => {
        const entity = await packageActions.createPaqueteDestino(data);
        dispatch({ type: "ADD_DESTINO", payload: entity as any });
        return entity as any as PaqueteDestino;
      },
      updateDestino: async (destino: PaqueteDestino) => {
        const { id, paqueteId: _paqueteId, ...rest } = destino;
        await packageActions.updatePaqueteDestino(id, rest);
        dispatch({ type: "UPDATE_DESTINO", payload: destino });
      },
      deleteDestino: async (id: string) => {
        await packageActions.deletePaqueteDestino(id);
        dispatch({ type: "DELETE_DESTINO", payload: id });
      },
      reorderDestinos: async (paqueteId: string, orderedIds: string[]) => {
        await packageActions.reorderPaqueteDestinos(paqueteId, orderedIds);
        dispatch({
          type: "REORDER_DESTINOS",
          payload: { paqueteId, orderedIds },
        });
      },

      // -- OpcionHotel CRUD --
      createOpcionHotel: async (data: Omit<OpcionHotel, "id">) => {
        const entity = await packageActions.createOpcionHotel(data);
        dispatch({ type: "ADD_OPCION_HOTEL", payload: entity as any });
        return entity as any as OpcionHotel;
      },
      updateOpcionHotel: async (oh: OpcionHotel) => {
        const { id, opcionHoteleraId: _op, destinoId: _d, ...rest } = oh;
        await packageActions.updateOpcionHotel(id, rest);
        dispatch({ type: "UPDATE_OPCION_HOTEL", payload: oh });
      },
      deleteOpcionHotel: async (id: string) => {
        await packageActions.deleteOpcionHotel(id);
        dispatch({ type: "DELETE_OPCION_HOTEL", payload: id });
      },
      /**
       * Assigns (or updates) the hotel for a given (opcion, destino) pair.
       * One-shot handler used by the UI dropdown.
       */
      upsertOpcionHotelPrincipal: async (
        opcionHoteleraId: string,
        destinoId: string,
        alojamientoId: string,
      ) => {
        const entity = await packageActions.upsertOpcionHotelPrincipal(
          opcionHoteleraId,
          destinoId,
          alojamientoId,
        );
        // Reducer handles both create and update cleanly: we dispatch an
        // UPDATE_OPCION_HOTEL, and if the row isn't in state yet, follow
        // with ADD_OPCION_HOTEL as fallback via a state check.
        // Simpler: just call ADD if not present, else UPDATE.
        dispatch({
          type: "ADD_OPCION_HOTEL",
          payload: entity as any,
        });
        return entity as any as OpcionHotel;
      },
    }),
    [dispatch],
  );
}

// ---------------------------------------------------------------------------
// OpcionesHoteleras selector hook
// ---------------------------------------------------------------------------
export function useOpcionesHoteleras(paqueteId: string): OpcionHotelera[] {
  const state = usePackageState();
  return useMemo(
    () =>
      state.opcionesHoteleras
        .filter((o) => o.paqueteId === paqueteId)
        .sort((a, b) => a.orden - b.orden),
    [state.opcionesHoteleras, paqueteId],
  );
}

// ---------------------------------------------------------------------------
// All opciones hoteleras (bulk, for listing pages)
// ---------------------------------------------------------------------------
export function useAllOpcionesHoteleras(): OpcionHotelera[] {
  const state = usePackageState();
  return state.opcionesHoteleras;
}

// ---------------------------------------------------------------------------
// Destinos hooks (itinerario)
// ---------------------------------------------------------------------------

/** Destinos of a single paquete, sorted by orden. */
export function useDestinos(paqueteId: string): PaqueteDestino[] {
  const state = usePackageState();
  return useMemo(
    () =>
      state.destinos
        .filter((d) => d.paqueteId === paqueteId)
        .sort((a, b) => a.orden - b.orden),
    [state.destinos, paqueteId],
  );
}

/** All destinos across all paquetes — used by listing pages to compute total nights. */
export function useAllDestinos(): PaqueteDestino[] {
  return usePackageState().destinos;
}

/** Total nights for a paquete, computed from its destinos. */
export function useNochesTotales(paqueteId: string): number {
  const state = usePackageState();
  const destinos = useDestinos(paqueteId);
  const paquete = useMemo(
    () => state.paquetes.find((p) => p.id === paqueteId),
    [state.paquetes, paqueteId],
  );
  const total = useMemo(() => computeNochesTotales(destinos), [destinos]);

  if (destinos.length > 0) return total;
  return paquete?.noches ?? total;
}

// ---------------------------------------------------------------------------
// OpcionHotel hooks
// ---------------------------------------------------------------------------

/** OpcionHotel rows for a single opcion, sorted by orden. */
export function useOpcionHoteles(opcionHoteleraId: string): OpcionHotel[] {
  const state = usePackageState();
  return useMemo(
    () =>
      state.opcionHoteles
        .filter((oh) => oh.opcionHoteleraId === opcionHoteleraId)
        .sort((a, b) => a.orden - b.orden),
    [state.opcionHoteles, opcionHoteleraId],
  );
}

/** All OpcionHotel rows across all opciones — bulk access for computed totals. */
export function useAllOpcionHoteles(): OpcionHotel[] {
  return usePackageState().opcionHoteles;
}

// ---------------------------------------------------------------------------
// Helper: get all service assignments for a specific paquete
// ---------------------------------------------------------------------------
export function usePaqueteServices(paqueteId: string) {
  const state = usePackageState();
  return useMemo(() => {
    const byOrden = <T extends { orden: number }>(a: T, b: T) =>
      a.orden - b.orden;
    return {
      aereos: state.paqueteAereos
        .filter((pa) => pa.paqueteId === paqueteId)
        .sort(byOrden),
      alojamientos: state.paqueteAlojamientos
        .filter((pa) => pa.paqueteId === paqueteId)
        .sort(byOrden),
      traslados: state.paqueteTraslados
        .filter((pt) => pt.paqueteId === paqueteId)
        .sort(byOrden),
      seguros: state.paqueteSeguros
        .filter((ps) => ps.paqueteId === paqueteId)
        .sort(byOrden),
      circuitos: state.paqueteCircuitos
        .filter((pc) => pc.paqueteId === paqueteId)
        .sort(byOrden),
      fotos: state.paqueteFotos
        .filter((pf) => pf.paqueteId === paqueteId)
        .sort(byOrden),
      etiquetas: state.paqueteEtiquetas.filter(
        (pe) => pe.paqueteId === paqueteId,
      ),
    };
  }, [state, paqueteId]);
}
