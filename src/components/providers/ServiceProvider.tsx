"use client";

import {
  createContext,
  useContext,
  useReducer,
  useMemo,
  type Dispatch,
} from "react";
import type {
  Aereo,
  PrecioAereo,
  Alojamiento,
  PrecioAlojamiento,
  AlojamientoFoto,
  Traslado,
  Seguro,
  Circuito,
  CircuitoDia,
  PrecioCircuito,
} from "@/lib/types";
import {
  SEED_AEREOS,
  SEED_PRECIOS_AEREO,
  SEED_ALOJAMIENTOS,
  SEED_PRECIOS_ALOJAMIENTO,
  SEED_ALOJAMIENTO_FOTOS,
  SEED_TRASLADOS,
  SEED_SEGUROS,
  SEED_CIRCUITOS,
  SEED_CIRCUITO_DIAS,
  SEED_PRECIOS_CIRCUITO,
} from "@/lib/data";
import { useBrand } from "./BrandProvider";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
interface ServiceState {
  aereos: Aereo[];
  preciosAereo: PrecioAereo[];
  alojamientos: Alojamiento[];
  preciosAlojamiento: PrecioAlojamiento[];
  alojamientoFotos: AlojamientoFoto[];
  traslados: Traslado[];
  seguros: Seguro[];
  circuitos: Circuito[];
  circuitoDias: CircuitoDia[];
  preciosCircuito: PrecioCircuito[];
}

const initialState: ServiceState = {
  aereos: SEED_AEREOS,
  preciosAereo: SEED_PRECIOS_AEREO,
  alojamientos: SEED_ALOJAMIENTOS,
  preciosAlojamiento: SEED_PRECIOS_ALOJAMIENTO,
  alojamientoFotos: SEED_ALOJAMIENTO_FOTOS,
  traslados: SEED_TRASLADOS,
  seguros: SEED_SEGUROS,
  circuitos: SEED_CIRCUITOS,
  circuitoDias: SEED_CIRCUITO_DIAS,
  preciosCircuito: SEED_PRECIOS_CIRCUITO,
};

// ---------------------------------------------------------------------------
// Actions (discriminated union)
// ---------------------------------------------------------------------------
type ServiceAction =
  // Aereo (soft delete)
  | { type: "ADD_AEREO"; payload: Aereo }
  | { type: "UPDATE_AEREO"; payload: Aereo }
  | { type: "DELETE_AEREO"; payload: string }
  // PrecioAereo (hard delete)
  | { type: "ADD_PRECIO_AEREO"; payload: PrecioAereo }
  | { type: "UPDATE_PRECIO_AEREO"; payload: PrecioAereo }
  | { type: "DELETE_PRECIO_AEREO"; payload: string }
  // Alojamiento (soft delete)
  | { type: "ADD_ALOJAMIENTO"; payload: Alojamiento }
  | { type: "UPDATE_ALOJAMIENTO"; payload: Alojamiento }
  | { type: "DELETE_ALOJAMIENTO"; payload: string }
  // PrecioAlojamiento (hard delete)
  | { type: "ADD_PRECIO_ALOJAMIENTO"; payload: PrecioAlojamiento }
  | { type: "UPDATE_PRECIO_ALOJAMIENTO"; payload: PrecioAlojamiento }
  | { type: "DELETE_PRECIO_ALOJAMIENTO"; payload: string }
  // AlojamientoFoto (hard delete)
  | { type: "ADD_ALOJAMIENTO_FOTO"; payload: AlojamientoFoto }
  | { type: "UPDATE_ALOJAMIENTO_FOTO"; payload: AlojamientoFoto }
  | { type: "DELETE_ALOJAMIENTO_FOTO"; payload: string }
  // Traslado (soft delete)
  | { type: "ADD_TRASLADO"; payload: Traslado }
  | { type: "UPDATE_TRASLADO"; payload: Traslado }
  | { type: "DELETE_TRASLADO"; payload: string }
  // Seguro (soft delete)
  | { type: "ADD_SEGURO"; payload: Seguro }
  | { type: "UPDATE_SEGURO"; payload: Seguro }
  | { type: "DELETE_SEGURO"; payload: string }
  // Circuito (soft delete)
  | { type: "ADD_CIRCUITO"; payload: Circuito }
  | { type: "UPDATE_CIRCUITO"; payload: Circuito }
  | { type: "DELETE_CIRCUITO"; payload: string }
  // CircuitoDia (hard delete)
  | { type: "ADD_CIRCUITO_DIA"; payload: CircuitoDia }
  | { type: "UPDATE_CIRCUITO_DIA"; payload: CircuitoDia }
  | { type: "DELETE_CIRCUITO_DIA"; payload: string }
  // PrecioCircuito (hard delete)
  | { type: "ADD_PRECIO_CIRCUITO"; payload: PrecioCircuito }
  | { type: "UPDATE_PRECIO_CIRCUITO"; payload: PrecioCircuito }
  | { type: "DELETE_PRECIO_CIRCUITO"; payload: string };

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------
function serviceReducer(state: ServiceState, action: ServiceAction): ServiceState {
  switch (action.type) {
    // -- Aereo (soft delete) --
    case "ADD_AEREO":
      return { ...state, aereos: [...state.aereos, action.payload] };
    case "UPDATE_AEREO":
      return {
        ...state,
        aereos: state.aereos.map((e) =>
          e.id === action.payload.id ? action.payload : e,
        ),
      };
    case "DELETE_AEREO":
      return {
        ...state,
        aereos: state.aereos.map((e) =>
          e.id === action.payload
            ? { ...e, deletedAt: new Date().toISOString() }
            : e,
        ),
      };

    // -- PrecioAereo (hard delete) --
    case "ADD_PRECIO_AEREO":
      return { ...state, preciosAereo: [...state.preciosAereo, action.payload] };
    case "UPDATE_PRECIO_AEREO":
      return {
        ...state,
        preciosAereo: state.preciosAereo.map((e) =>
          e.id === action.payload.id ? action.payload : e,
        ),
      };
    case "DELETE_PRECIO_AEREO":
      return {
        ...state,
        preciosAereo: state.preciosAereo.filter((e) => e.id !== action.payload),
      };

    // -- Alojamiento (soft delete) --
    case "ADD_ALOJAMIENTO":
      return { ...state, alojamientos: [...state.alojamientos, action.payload] };
    case "UPDATE_ALOJAMIENTO":
      return {
        ...state,
        alojamientos: state.alojamientos.map((e) =>
          e.id === action.payload.id ? action.payload : e,
        ),
      };
    case "DELETE_ALOJAMIENTO":
      return {
        ...state,
        alojamientos: state.alojamientos.map((e) =>
          e.id === action.payload
            ? { ...e, deletedAt: new Date().toISOString() }
            : e,
        ),
      };

    // -- PrecioAlojamiento (hard delete) --
    case "ADD_PRECIO_ALOJAMIENTO":
      return {
        ...state,
        preciosAlojamiento: [...state.preciosAlojamiento, action.payload],
      };
    case "UPDATE_PRECIO_ALOJAMIENTO":
      return {
        ...state,
        preciosAlojamiento: state.preciosAlojamiento.map((e) =>
          e.id === action.payload.id ? action.payload : e,
        ),
      };
    case "DELETE_PRECIO_ALOJAMIENTO":
      return {
        ...state,
        preciosAlojamiento: state.preciosAlojamiento.filter(
          (e) => e.id !== action.payload,
        ),
      };

    // -- AlojamientoFoto (hard delete) --
    case "ADD_ALOJAMIENTO_FOTO":
      return {
        ...state,
        alojamientoFotos: [...state.alojamientoFotos, action.payload],
      };
    case "UPDATE_ALOJAMIENTO_FOTO":
      return {
        ...state,
        alojamientoFotos: state.alojamientoFotos.map((e) =>
          e.id === action.payload.id ? action.payload : e,
        ),
      };
    case "DELETE_ALOJAMIENTO_FOTO":
      return {
        ...state,
        alojamientoFotos: state.alojamientoFotos.filter(
          (e) => e.id !== action.payload,
        ),
      };

    // -- Traslado (soft delete) --
    case "ADD_TRASLADO":
      return { ...state, traslados: [...state.traslados, action.payload] };
    case "UPDATE_TRASLADO":
      return {
        ...state,
        traslados: state.traslados.map((e) =>
          e.id === action.payload.id ? action.payload : e,
        ),
      };
    case "DELETE_TRASLADO":
      return {
        ...state,
        traslados: state.traslados.map((e) =>
          e.id === action.payload
            ? { ...e, deletedAt: new Date().toISOString() }
            : e,
        ),
      };

    // -- Seguro (soft delete) --
    case "ADD_SEGURO":
      return { ...state, seguros: [...state.seguros, action.payload] };
    case "UPDATE_SEGURO":
      return {
        ...state,
        seguros: state.seguros.map((e) =>
          e.id === action.payload.id ? action.payload : e,
        ),
      };
    case "DELETE_SEGURO":
      return {
        ...state,
        seguros: state.seguros.map((e) =>
          e.id === action.payload
            ? { ...e, deletedAt: new Date().toISOString() }
            : e,
        ),
      };

    // -- Circuito (soft delete) --
    case "ADD_CIRCUITO":
      return { ...state, circuitos: [...state.circuitos, action.payload] };
    case "UPDATE_CIRCUITO":
      return {
        ...state,
        circuitos: state.circuitos.map((e) =>
          e.id === action.payload.id ? action.payload : e,
        ),
      };
    case "DELETE_CIRCUITO":
      return {
        ...state,
        circuitos: state.circuitos.map((e) =>
          e.id === action.payload
            ? { ...e, deletedAt: new Date().toISOString() }
            : e,
        ),
      };

    // -- CircuitoDia (hard delete) --
    case "ADD_CIRCUITO_DIA":
      return { ...state, circuitoDias: [...state.circuitoDias, action.payload] };
    case "UPDATE_CIRCUITO_DIA":
      return {
        ...state,
        circuitoDias: state.circuitoDias.map((e) =>
          e.id === action.payload.id ? action.payload : e,
        ),
      };
    case "DELETE_CIRCUITO_DIA":
      return {
        ...state,
        circuitoDias: state.circuitoDias.filter((e) => e.id !== action.payload),
      };

    // -- PrecioCircuito (hard delete) --
    case "ADD_PRECIO_CIRCUITO":
      return {
        ...state,
        preciosCircuito: [...state.preciosCircuito, action.payload],
      };
    case "UPDATE_PRECIO_CIRCUITO":
      return {
        ...state,
        preciosCircuito: state.preciosCircuito.map((e) =>
          e.id === action.payload.id ? action.payload : e,
        ),
      };
    case "DELETE_PRECIO_CIRCUITO":
      return {
        ...state,
        preciosCircuito: state.preciosCircuito.filter(
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
const ServiceStateContext = createContext<ServiceState | null>(null);
const ServiceDispatchContext = createContext<Dispatch<ServiceAction> | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export function ServiceProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(serviceReducer, initialState);

  return (
    <ServiceStateContext.Provider value={state}>
      <ServiceDispatchContext.Provider value={dispatch}>
        {children}
      </ServiceDispatchContext.Provider>
    </ServiceStateContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Raw state / dispatch hooks
// ---------------------------------------------------------------------------
export function useServiceState(): ServiceState {
  const ctx = useContext(ServiceStateContext);
  if (!ctx) {
    throw new Error("useServiceState must be used within a <ServiceProvider>");
  }
  return ctx;
}

export function useServiceDispatch(): Dispatch<ServiceAction> {
  const ctx = useContext(ServiceDispatchContext);
  if (!ctx) {
    throw new Error("useServiceDispatch must be used within a <ServiceProvider>");
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Brand-filtered selector hooks (primary entities only)
// ---------------------------------------------------------------------------

export function useAereos(): Aereo[] {
  const { activeBrandId } = useBrand();
  const state = useServiceState();
  return useMemo(
    () =>
      state.aereos.filter(
        (a) => a.brandId === activeBrandId && !a.deletedAt,
      ),
    [state.aereos, activeBrandId],
  );
}

export function useAlojamientos(): Alojamiento[] {
  const { activeBrandId } = useBrand();
  const state = useServiceState();
  return useMemo(
    () =>
      state.alojamientos.filter(
        (a) => a.brandId === activeBrandId && !a.deletedAt,
      ),
    [state.alojamientos, activeBrandId],
  );
}

export function useTraslados(): Traslado[] {
  const { activeBrandId } = useBrand();
  const state = useServiceState();
  return useMemo(
    () =>
      state.traslados.filter(
        (t) => t.brandId === activeBrandId && !t.deletedAt,
      ),
    [state.traslados, activeBrandId],
  );
}

export function useSeguros(): Seguro[] {
  const { activeBrandId } = useBrand();
  const state = useServiceState();
  return useMemo(
    () =>
      state.seguros.filter(
        (s) => s.brandId === activeBrandId && !s.deletedAt,
      ),
    [state.seguros, activeBrandId],
  );
}

export function useCircuitos(): Circuito[] {
  const { activeBrandId } = useBrand();
  const state = useServiceState();
  return useMemo(
    () =>
      state.circuitos.filter(
        (c) => c.brandId === activeBrandId && !c.deletedAt,
      ),
    [state.circuitos, activeBrandId],
  );
}

// ---------------------------------------------------------------------------
// CRUD action hook
// ---------------------------------------------------------------------------
export function useServiceActions() {
  const dispatch = useServiceDispatch();

  return useMemo(
    () => ({
      // -- Aereo --
      createAereo: (
        data: Omit<Aereo, "id" | "createdAt" | "updatedAt" | "deletedAt">,
      ): Aereo => {
        const now = new Date().toISOString();
        const entity: Aereo = {
          ...data,
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        };
        dispatch({ type: "ADD_AEREO", payload: entity });
        return entity;
      },
      updateAereo: (entity: Aereo) =>
        dispatch({
          type: "UPDATE_AEREO",
          payload: { ...entity, updatedAt: new Date().toISOString() },
        }),
      deleteAereo: (id: string) =>
        dispatch({ type: "DELETE_AEREO", payload: id }),

      // -- PrecioAereo --
      createPrecioAereo: (data: Omit<PrecioAereo, "id">): PrecioAereo => {
        const entity: PrecioAereo = {
          ...data,
          id: crypto.randomUUID(),
        };
        dispatch({ type: "ADD_PRECIO_AEREO", payload: entity });
        return entity;
      },
      updatePrecioAereo: (entity: PrecioAereo) =>
        dispatch({ type: "UPDATE_PRECIO_AEREO", payload: entity }),
      deletePrecioAereo: (id: string) =>
        dispatch({ type: "DELETE_PRECIO_AEREO", payload: id }),

      // -- Alojamiento --
      createAlojamiento: (
        data: Omit<Alojamiento, "id" | "createdAt" | "updatedAt" | "deletedAt">,
      ): Alojamiento => {
        const now = new Date().toISOString();
        const entity: Alojamiento = {
          ...data,
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        };
        dispatch({ type: "ADD_ALOJAMIENTO", payload: entity });
        return entity;
      },
      updateAlojamiento: (entity: Alojamiento) =>
        dispatch({
          type: "UPDATE_ALOJAMIENTO",
          payload: { ...entity, updatedAt: new Date().toISOString() },
        }),
      deleteAlojamiento: (id: string) =>
        dispatch({ type: "DELETE_ALOJAMIENTO", payload: id }),

      // -- PrecioAlojamiento --
      createPrecioAlojamiento: (
        data: Omit<PrecioAlojamiento, "id">,
      ): PrecioAlojamiento => {
        const entity: PrecioAlojamiento = {
          ...data,
          id: crypto.randomUUID(),
        };
        dispatch({ type: "ADD_PRECIO_ALOJAMIENTO", payload: entity });
        return entity;
      },
      updatePrecioAlojamiento: (entity: PrecioAlojamiento) =>
        dispatch({ type: "UPDATE_PRECIO_ALOJAMIENTO", payload: entity }),
      deletePrecioAlojamiento: (id: string) =>
        dispatch({ type: "DELETE_PRECIO_ALOJAMIENTO", payload: id }),

      // -- AlojamientoFoto --
      createAlojamientoFoto: (
        data: Omit<AlojamientoFoto, "id">,
      ): AlojamientoFoto => {
        const entity: AlojamientoFoto = {
          ...data,
          id: crypto.randomUUID(),
        };
        dispatch({ type: "ADD_ALOJAMIENTO_FOTO", payload: entity });
        return entity;
      },
      updateAlojamientoFoto: (entity: AlojamientoFoto) =>
        dispatch({ type: "UPDATE_ALOJAMIENTO_FOTO", payload: entity }),
      deleteAlojamientoFoto: (id: string) =>
        dispatch({ type: "DELETE_ALOJAMIENTO_FOTO", payload: id }),

      // -- Traslado --
      createTraslado: (
        data: Omit<Traslado, "id" | "createdAt" | "updatedAt" | "deletedAt">,
      ): Traslado => {
        const now = new Date().toISOString();
        const entity: Traslado = {
          ...data,
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        };
        dispatch({ type: "ADD_TRASLADO", payload: entity });
        return entity;
      },
      updateTraslado: (entity: Traslado) =>
        dispatch({
          type: "UPDATE_TRASLADO",
          payload: { ...entity, updatedAt: new Date().toISOString() },
        }),
      deleteTraslado: (id: string) =>
        dispatch({ type: "DELETE_TRASLADO", payload: id }),

      // -- Seguro --
      createSeguro: (
        data: Omit<Seguro, "id" | "createdAt" | "updatedAt" | "deletedAt">,
      ): Seguro => {
        const now = new Date().toISOString();
        const entity: Seguro = {
          ...data,
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        };
        dispatch({ type: "ADD_SEGURO", payload: entity });
        return entity;
      },
      updateSeguro: (entity: Seguro) =>
        dispatch({
          type: "UPDATE_SEGURO",
          payload: { ...entity, updatedAt: new Date().toISOString() },
        }),
      deleteSeguro: (id: string) =>
        dispatch({ type: "DELETE_SEGURO", payload: id }),

      // -- Circuito --
      createCircuito: (
        data: Omit<Circuito, "id" | "createdAt" | "updatedAt" | "deletedAt">,
      ): Circuito => {
        const now = new Date().toISOString();
        const entity: Circuito = {
          ...data,
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        };
        dispatch({ type: "ADD_CIRCUITO", payload: entity });
        return entity;
      },
      updateCircuito: (entity: Circuito) =>
        dispatch({
          type: "UPDATE_CIRCUITO",
          payload: { ...entity, updatedAt: new Date().toISOString() },
        }),
      deleteCircuito: (id: string) =>
        dispatch({ type: "DELETE_CIRCUITO", payload: id }),

      // -- CircuitoDia --
      createCircuitoDia: (data: Omit<CircuitoDia, "id">): CircuitoDia => {
        const entity: CircuitoDia = {
          ...data,
          id: crypto.randomUUID(),
        };
        dispatch({ type: "ADD_CIRCUITO_DIA", payload: entity });
        return entity;
      },
      updateCircuitoDia: (entity: CircuitoDia) =>
        dispatch({ type: "UPDATE_CIRCUITO_DIA", payload: entity }),
      deleteCircuitoDia: (id: string) =>
        dispatch({ type: "DELETE_CIRCUITO_DIA", payload: id }),

      // -- PrecioCircuito --
      createPrecioCircuito: (
        data: Omit<PrecioCircuito, "id">,
      ): PrecioCircuito => {
        const entity: PrecioCircuito = {
          ...data,
          id: crypto.randomUUID(),
        };
        dispatch({ type: "ADD_PRECIO_CIRCUITO", payload: entity });
        return entity;
      },
      updatePrecioCircuito: (entity: PrecioCircuito) =>
        dispatch({ type: "UPDATE_PRECIO_CIRCUITO", payload: entity }),
      deletePrecioCircuito: (id: string) =>
        dispatch({ type: "DELETE_PRECIO_CIRCUITO", payload: id }),
    }),
    [dispatch],
  );
}
