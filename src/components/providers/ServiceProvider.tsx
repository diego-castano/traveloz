"use client";

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
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
import * as serviceActions from "@/actions/service.actions";
import { useBrand } from "./BrandProvider";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
interface ServiceState {
  loading: boolean;
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
  loading: true,
  aereos: [],
  preciosAereo: [],
  alojamientos: [],
  preciosAlojamiento: [],
  alojamientoFotos: [],
  traslados: [],
  seguros: [],
  circuitos: [],
  circuitoDias: [],
  preciosCircuito: [],
};

// ---------------------------------------------------------------------------
// Actions (discriminated union)
// ---------------------------------------------------------------------------
type ServiceAction =
  | { type: "SET_ALL"; payload: ServiceState }
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
    case "SET_ALL":
      return action.payload;

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
  const { activeBrandId } = useBrand();
  const [state, dispatch] = useReducer(serviceReducer, initialState);

  useEffect(() => {
    let cancelled = false;
    dispatch({ type: "SET_ALL", payload: { ...initialState, loading: true } });

    serviceActions
      .getAllServices(activeBrandId)
      .then((data) => {
        if (cancelled) return;
        dispatch({
          type: "SET_ALL",
          payload: {
            loading: false,
            aereos: data.aereos as any,
            preciosAereo: data.preciosAereo as any,
            alojamientos: data.alojamientos as any,
            preciosAlojamiento: data.preciosAlojamiento as any,
            alojamientoFotos: data.alojamientoFotos as any,
            traslados: data.traslados as any,
            seguros: data.seguros as any,
            circuitos: data.circuitos as any,
            circuitoDias: data.circuitoDias as any,
            preciosCircuito: data.preciosCircuito as any,
          },
        });
      })
      .catch(console.error);

    return () => {
      cancelled = true;
    };
  }, [activeBrandId]);

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
      createAereo: async (
        data: Omit<Aereo, "id" | "createdAt" | "updatedAt" | "deletedAt">,
      ) => {
        const entity = await serviceActions.createAereo(data);
        dispatch({ type: "ADD_AEREO", payload: entity as any });
        return entity as any;
      },
      updateAereo: async (entity: Aereo) => {
        await serviceActions.updateAereo(entity.id, entity);
        dispatch({ type: "UPDATE_AEREO", payload: entity });
      },
      deleteAereo: async (id: string) => {
        await serviceActions.deleteAereo(id);
        dispatch({ type: "DELETE_AEREO", payload: id });
      },

      // -- PrecioAereo --
      createPrecioAereo: async (data: Omit<PrecioAereo, "id">) => {
        const entity = await serviceActions.createPrecioAereo(data);
        dispatch({ type: "ADD_PRECIO_AEREO", payload: entity as any });
        return entity as any;
      },
      updatePrecioAereo: async (entity: PrecioAereo) => {
        await serviceActions.updatePrecioAereo(entity.id, entity);
        dispatch({ type: "UPDATE_PRECIO_AEREO", payload: entity });
      },
      deletePrecioAereo: async (id: string) => {
        await serviceActions.deletePrecioAereo(id);
        dispatch({ type: "DELETE_PRECIO_AEREO", payload: id });
      },

      // -- Alojamiento --
      createAlojamiento: async (
        data: Omit<Alojamiento, "id" | "createdAt" | "updatedAt" | "deletedAt">,
      ) => {
        const entity = await serviceActions.createAlojamiento(data);
        dispatch({ type: "ADD_ALOJAMIENTO", payload: entity as any });
        return entity as any;
      },
      updateAlojamiento: async (entity: Alojamiento) => {
        await serviceActions.updateAlojamiento(entity.id, entity);
        dispatch({ type: "UPDATE_ALOJAMIENTO", payload: entity });
      },
      deleteAlojamiento: async (id: string) => {
        await serviceActions.deleteAlojamiento(id);
        dispatch({ type: "DELETE_ALOJAMIENTO", payload: id });
      },

      // -- PrecioAlojamiento --
      createPrecioAlojamiento: async (
        data: Omit<PrecioAlojamiento, "id">,
      ) => {
        const entity = await serviceActions.createPrecioAlojamiento(data);
        dispatch({ type: "ADD_PRECIO_ALOJAMIENTO", payload: entity as any });
        return entity as any;
      },
      updatePrecioAlojamiento: async (entity: PrecioAlojamiento) => {
        await serviceActions.updatePrecioAlojamiento(entity.id, entity);
        dispatch({ type: "UPDATE_PRECIO_ALOJAMIENTO", payload: entity });
      },
      deletePrecioAlojamiento: async (id: string) => {
        await serviceActions.deletePrecioAlojamiento(id);
        dispatch({ type: "DELETE_PRECIO_ALOJAMIENTO", payload: id });
      },

      // -- AlojamientoFoto --
      createAlojamientoFoto: async (
        data: Omit<AlojamientoFoto, "id">,
      ) => {
        const entity = await serviceActions.createAlojamientoFoto(data);
        dispatch({ type: "ADD_ALOJAMIENTO_FOTO", payload: entity as any });
        return entity as any;
      },
      updateAlojamientoFoto: async (entity: AlojamientoFoto) => {
        await serviceActions.updateAlojamientoFoto(entity.id, entity);
        dispatch({ type: "UPDATE_ALOJAMIENTO_FOTO", payload: entity });
      },
      deleteAlojamientoFoto: async (id: string) => {
        await serviceActions.deleteAlojamientoFoto(id);
        dispatch({ type: "DELETE_ALOJAMIENTO_FOTO", payload: id });
      },

      // -- Traslado --
      createTraslado: async (
        data: Omit<Traslado, "id" | "createdAt" | "updatedAt" | "deletedAt">,
      ) => {
        const entity = await serviceActions.createTraslado(data);
        dispatch({ type: "ADD_TRASLADO", payload: entity as any });
        return entity as any;
      },
      updateTraslado: async (entity: Traslado) => {
        await serviceActions.updateTraslado(entity.id, entity);
        dispatch({ type: "UPDATE_TRASLADO", payload: entity });
      },
      deleteTraslado: async (id: string) => {
        await serviceActions.deleteTraslado(id);
        dispatch({ type: "DELETE_TRASLADO", payload: id });
      },

      // -- Seguro --
      createSeguro: async (
        data: Omit<Seguro, "id" | "createdAt" | "updatedAt" | "deletedAt">,
      ) => {
        const entity = await serviceActions.createSeguro(data);
        dispatch({ type: "ADD_SEGURO", payload: entity as any });
        return entity as any;
      },
      updateSeguro: async (entity: Seguro) => {
        await serviceActions.updateSeguro(entity.id, entity);
        dispatch({ type: "UPDATE_SEGURO", payload: entity });
      },
      deleteSeguro: async (id: string) => {
        await serviceActions.deleteSeguro(id);
        dispatch({ type: "DELETE_SEGURO", payload: id });
      },

      // -- Circuito --
      createCircuito: async (
        data: Omit<Circuito, "id" | "createdAt" | "updatedAt" | "deletedAt">,
      ) => {
        const entity = await serviceActions.createCircuito(data);
        dispatch({ type: "ADD_CIRCUITO", payload: entity as any });
        return entity as any;
      },
      updateCircuito: async (entity: Circuito) => {
        await serviceActions.updateCircuito(entity.id, entity);
        dispatch({ type: "UPDATE_CIRCUITO", payload: entity });
      },
      deleteCircuito: async (id: string) => {
        await serviceActions.deleteCircuito(id);
        dispatch({ type: "DELETE_CIRCUITO", payload: id });
      },

      // -- CircuitoDia --
      createCircuitoDia: async (data: Omit<CircuitoDia, "id">) => {
        const entity = await serviceActions.createCircuitoDia(data);
        dispatch({ type: "ADD_CIRCUITO_DIA", payload: entity as any });
        return entity as any;
      },
      updateCircuitoDia: async (entity: CircuitoDia) => {
        await serviceActions.updateCircuitoDia(entity.id, entity);
        dispatch({ type: "UPDATE_CIRCUITO_DIA", payload: entity });
      },
      deleteCircuitoDia: async (id: string) => {
        await serviceActions.deleteCircuitoDia(id);
        dispatch({ type: "DELETE_CIRCUITO_DIA", payload: id });
      },

      // -- PrecioCircuito --
      createPrecioCircuito: async (
        data: Omit<PrecioCircuito, "id">,
      ) => {
        const entity = await serviceActions.createPrecioCircuito(data);
        dispatch({ type: "ADD_PRECIO_CIRCUITO", payload: entity as any });
        return entity as any;
      },
      updatePrecioCircuito: async (entity: PrecioCircuito) => {
        await serviceActions.updatePrecioCircuito(entity.id, entity);
        dispatch({ type: "UPDATE_PRECIO_CIRCUITO", payload: entity });
      },
      deletePrecioCircuito: async (id: string) => {
        await serviceActions.deletePrecioCircuito(id);
        dispatch({ type: "DELETE_PRECIO_CIRCUITO", payload: id });
      },
    }),
    [dispatch],
  );
}
