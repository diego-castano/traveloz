"use client";

import {
  createContext,
  useContext,
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
} from "@/lib/types";
import {
  SEED_PAQUETES,
  SEED_PAQUETE_AEREOS,
  SEED_PAQUETE_ALOJAMIENTOS,
  SEED_PAQUETE_TRASLADOS,
  SEED_PAQUETE_SEGUROS,
  SEED_PAQUETE_CIRCUITOS,
  SEED_PAQUETE_FOTOS,
  SEED_PAQUETE_ETIQUETAS,
} from "@/lib/data";
import { useBrand } from "./BrandProvider";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
interface PackageState {
  paquetes: Paquete[];
  paqueteAereos: PaqueteAereo[];
  paqueteAlojamientos: PaqueteAlojamiento[];
  paqueteTraslados: PaqueteTraslado[];
  paqueteSeguros: PaqueteSeguro[];
  paqueteCircuitos: PaqueteCircuito[];
  paqueteFotos: PaqueteFoto[];
  paqueteEtiquetas: PaqueteEtiqueta[];
}

const initialState: PackageState = {
  paquetes: SEED_PAQUETES,
  paqueteAereos: SEED_PAQUETE_AEREOS,
  paqueteAlojamientos: SEED_PAQUETE_ALOJAMIENTOS,
  paqueteTraslados: SEED_PAQUETE_TRASLADOS,
  paqueteSeguros: SEED_PAQUETE_SEGUROS,
  paqueteCircuitos: SEED_PAQUETE_CIRCUITOS,
  paqueteFotos: SEED_PAQUETE_FOTOS,
  paqueteEtiquetas: SEED_PAQUETE_ETIQUETAS,
};

// ---------------------------------------------------------------------------
// Actions (discriminated union)
// ---------------------------------------------------------------------------
type PackageAction =
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
  | { type: "DELETE_PAQUETE_ETIQUETA"; payload: string };

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------
function packageReducer(state: PackageState, action: PackageAction): PackageState {
  switch (action.type) {
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
      createPaquete: (
        data: Omit<Paquete, "id" | "createdAt" | "updatedAt" | "deletedAt">,
      ): Paquete => {
        const now = new Date().toISOString();
        const paquete: Paquete = {
          ...data,
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        };
        dispatch({ type: "ADD_PAQUETE", payload: paquete });
        return paquete;
      },
      updatePaquete: (paquete: Paquete) =>
        dispatch({
          type: "UPDATE_PAQUETE",
          payload: { ...paquete, updatedAt: new Date().toISOString() },
        }),
      deletePaquete: (id: string) =>
        dispatch({ type: "DELETE_PAQUETE", payload: id }),
      clonePaquete: (id: string) =>
        dispatch({ type: "CLONE_PAQUETE", payload: id }),

      // -- Aereo assignment --
      assignAereo: (data: Omit<PaqueteAereo, "id">): PaqueteAereo => {
        const assignment: PaqueteAereo = { ...data, id: crypto.randomUUID() };
        dispatch({ type: "ADD_PAQUETE_AEREO", payload: assignment });
        return assignment;
      },
      removeAereo: (id: string) =>
        dispatch({ type: "DELETE_PAQUETE_AEREO", payload: id }),
      updateAereoAssignment: (assignment: PaqueteAereo) =>
        dispatch({ type: "UPDATE_PAQUETE_AEREO", payload: assignment }),

      // -- Alojamiento assignment --
      assignAlojamiento: (
        data: Omit<PaqueteAlojamiento, "id">,
      ): PaqueteAlojamiento => {
        const assignment: PaqueteAlojamiento = {
          ...data,
          id: crypto.randomUUID(),
        };
        dispatch({ type: "ADD_PAQUETE_ALOJAMIENTO", payload: assignment });
        return assignment;
      },
      removeAlojamiento: (id: string) =>
        dispatch({ type: "DELETE_PAQUETE_ALOJAMIENTO", payload: id }),
      updateAlojamientoAssignment: (assignment: PaqueteAlojamiento) =>
        dispatch({ type: "UPDATE_PAQUETE_ALOJAMIENTO", payload: assignment }),

      // -- Traslado assignment --
      assignTraslado: (data: Omit<PaqueteTraslado, "id">): PaqueteTraslado => {
        const assignment: PaqueteTraslado = {
          ...data,
          id: crypto.randomUUID(),
        };
        dispatch({ type: "ADD_PAQUETE_TRASLADO", payload: assignment });
        return assignment;
      },
      removeTraslado: (id: string) =>
        dispatch({ type: "DELETE_PAQUETE_TRASLADO", payload: id }),
      updateTrasladoAssignment: (assignment: PaqueteTraslado) =>
        dispatch({ type: "UPDATE_PAQUETE_TRASLADO", payload: assignment }),

      // -- Seguro assignment --
      assignSeguro: (data: Omit<PaqueteSeguro, "id">): PaqueteSeguro => {
        const assignment: PaqueteSeguro = {
          ...data,
          id: crypto.randomUUID(),
        };
        dispatch({ type: "ADD_PAQUETE_SEGURO", payload: assignment });
        return assignment;
      },
      removeSeguro: (id: string) =>
        dispatch({ type: "DELETE_PAQUETE_SEGURO", payload: id }),
      updateSeguroAssignment: (assignment: PaqueteSeguro) =>
        dispatch({ type: "UPDATE_PAQUETE_SEGURO", payload: assignment }),

      // -- Circuito assignment --
      assignCircuito: (
        data: Omit<PaqueteCircuito, "id">,
      ): PaqueteCircuito => {
        const assignment: PaqueteCircuito = {
          ...data,
          id: crypto.randomUUID(),
        };
        dispatch({ type: "ADD_PAQUETE_CIRCUITO", payload: assignment });
        return assignment;
      },
      removeCircuito: (id: string) =>
        dispatch({ type: "DELETE_PAQUETE_CIRCUITO", payload: id }),
      updateCircuitoAssignment: (assignment: PaqueteCircuito) =>
        dispatch({ type: "UPDATE_PAQUETE_CIRCUITO", payload: assignment }),

      // -- Photo management --
      addFoto: (data: Omit<PaqueteFoto, "id">): PaqueteFoto => {
        const foto: PaqueteFoto = { ...data, id: crypto.randomUUID() };
        dispatch({ type: "ADD_PAQUETE_FOTO", payload: foto });
        return foto;
      },
      removeFoto: (id: string) =>
        dispatch({ type: "DELETE_PAQUETE_FOTO", payload: id }),
      updateFoto: (foto: PaqueteFoto) =>
        dispatch({ type: "UPDATE_PAQUETE_FOTO", payload: foto }),

      // -- Etiqueta assignment --
      assignEtiqueta: (
        data: Omit<PaqueteEtiqueta, "id">,
      ): PaqueteEtiqueta => {
        const assignment: PaqueteEtiqueta = {
          ...data,
          id: crypto.randomUUID(),
        };
        dispatch({ type: "ADD_PAQUETE_ETIQUETA", payload: assignment });
        return assignment;
      },
      removeEtiqueta: (id: string) =>
        dispatch({ type: "DELETE_PAQUETE_ETIQUETA", payload: id }),
    }),
    [dispatch],
  );
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
