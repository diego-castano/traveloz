"use client";

import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useMemo,
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

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
interface PackageState {
  loading: boolean;
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

    // -- Paquete (soft delete) --
    case "ADD_PAQUETE":
      return { ...state, paquetes: [...state.paquetes, action.payload] };
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
        paquetes: [...state.paquetes, cloned],
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

    dispatch({ type: "SET_ALL", payload: { ...initialState, loading: true } });

    // Wave 1 — only Paquete rows. Fast (<1 s). Lifts skeleton & shows list.
    packageActions
      .getBasePackages(activeBrandId)
      .then((base) => {
        if (cancelled) return;
        dispatch({
          type: "SET_ALL",
          payload: {
            ...initialState,
            loading: false,
            paquetes: base.paquetes as any,
          },
        });
      })
      .catch((err) => {
        console.error("Error fetching base packages:", err);
        if (cancelled) return;
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
  }, [activeBrandId, sessionStatus]);

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

// ---------------------------------------------------------------------------
// Brand-filtered selector hooks
// ---------------------------------------------------------------------------

export function usePaquetes(): Paquete[] {
  const { activeBrandId } = useBrand();
  const state = usePackageState();
  return useMemo(
    () =>
      state.paquetes.filter(
        (p) => p.brandId === activeBrandId && !p.deletedAt,
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
        data: Omit<Paquete, "id" | "createdAt" | "updatedAt" | "deletedAt">,
      ) => {
        const entity = await packageActions.createPaquete(data as any);
        dispatch({ type: "ADD_PAQUETE", payload: entity as any });
        return entity as any;
      },
      updatePaquete: async (paquete: Paquete) => {
        await packageActions.updatePaquete(paquete.id, paquete as any);
        dispatch({ type: "UPDATE_PAQUETE", payload: paquete });
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
      assignAereo: async (data: Omit<PaqueteAereo, "id">) => {
        const entity = await packageActions.assignAereo(data as any);
        dispatch({ type: "ADD_PAQUETE_AEREO", payload: entity as any });
        return entity as any;
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
        const entity = await packageActions.assignAlojamiento(data as any);
        dispatch({ type: "ADD_PAQUETE_ALOJAMIENTO", payload: entity as any });
        return entity as any;
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
        const entity = await packageActions.assignTraslado(data as any);
        dispatch({ type: "ADD_PAQUETE_TRASLADO", payload: entity as any });
        return entity as any;
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
        const entity = await packageActions.assignSeguro(data as any);
        dispatch({ type: "ADD_PAQUETE_SEGURO", payload: entity as any });
        return entity as any;
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
        const entity = await packageActions.assignCircuito(data as any);
        dispatch({ type: "ADD_PAQUETE_CIRCUITO", payload: entity as any });
        return entity as any;
      },
      removeCircuito: async (id: string) => {
        await packageActions.removeCircuito(id);
        dispatch({ type: "DELETE_PAQUETE_CIRCUITO", payload: id });
      },
      updateCircuitoAssignment: async (assignment: PaqueteCircuito) => {
        await packageActions.updateCircuitoAssignment(assignment.id, assignment as any);
        dispatch({ type: "UPDATE_PAQUETE_CIRCUITO", payload: assignment });
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
  const destinos = useDestinos(paqueteId);
  return useMemo(() => computeNochesTotales(destinos), [destinos]);
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
  return useMemo(
    () => ({
      aereos: state.paqueteAereos.filter((pa) => pa.paqueteId === paqueteId),
      alojamientos: state.paqueteAlojamientos.filter(
        (pa) => pa.paqueteId === paqueteId,
      ),
      traslados: state.paqueteTraslados.filter(
        (pt) => pt.paqueteId === paqueteId,
      ),
      seguros: state.paqueteSeguros.filter(
        (ps) => ps.paqueteId === paqueteId,
      ),
      circuitos: state.paqueteCircuitos.filter(
        (pc) => pc.paqueteId === paqueteId,
      ),
      fotos: state.paqueteFotos
        .filter((pf) => pf.paqueteId === paqueteId)
        .sort((a, b) => a.orden - b.orden),
      etiquetas: state.paqueteEtiquetas.filter(
        (pe) => pe.paqueteId === paqueteId,
      ),
    }),
    [state, paqueteId],
  );
}
