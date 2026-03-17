"use client";

import {
  createContext,
  useContext,
  useReducer,
  useMemo,
  type Dispatch,
} from "react";
import type {
  Temporada,
  TipoPaquete,
  Etiqueta,
  Pais,
  Ciudad,
  Regimen,
  Proveedor,
} from "@/lib/types";
import {
  SEED_TEMPORADAS,
  SEED_TIPOS_PAQUETE,
  SEED_ETIQUETAS,
  SEED_PAISES,
  SEED_CIUDADES,
  SEED_REGIMENES,
  SEED_PROVEEDORES,
} from "@/lib/data";
import { useBrand } from "./BrandProvider";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
interface CatalogState {
  temporadas: Temporada[];
  tiposPaquete: TipoPaquete[];
  etiquetas: Etiqueta[];
  paises: Pais[];
  ciudades: Ciudad[];
  regimenes: Regimen[];
  proveedores: Proveedor[];
}

const initialState: CatalogState = {
  temporadas: SEED_TEMPORADAS,
  tiposPaquete: SEED_TIPOS_PAQUETE,
  etiquetas: SEED_ETIQUETAS,
  paises: SEED_PAISES,
  ciudades: SEED_CIUDADES,
  regimenes: SEED_REGIMENES,
  proveedores: SEED_PROVEEDORES,
};

// ---------------------------------------------------------------------------
// Actions (discriminated union)
// ---------------------------------------------------------------------------
type CatalogAction =
  | { type: "ADD_TEMPORADA"; payload: Temporada }
  | { type: "UPDATE_TEMPORADA"; payload: Temporada }
  | { type: "DELETE_TEMPORADA"; payload: string }
  | { type: "ADD_TIPO_PAQUETE"; payload: TipoPaquete }
  | { type: "UPDATE_TIPO_PAQUETE"; payload: TipoPaquete }
  | { type: "DELETE_TIPO_PAQUETE"; payload: string }
  | { type: "ADD_ETIQUETA"; payload: Etiqueta }
  | { type: "UPDATE_ETIQUETA"; payload: Etiqueta }
  | { type: "DELETE_ETIQUETA"; payload: string }
  | { type: "ADD_PAIS"; payload: Pais }
  | { type: "UPDATE_PAIS"; payload: Pais }
  | { type: "DELETE_PAIS"; payload: string }
  | { type: "ADD_CIUDAD"; payload: Ciudad }
  | { type: "UPDATE_CIUDAD"; payload: Ciudad }
  | { type: "DELETE_CIUDAD"; payload: string }
  | { type: "ADD_REGIMEN"; payload: Regimen }
  | { type: "UPDATE_REGIMEN"; payload: Regimen }
  | { type: "DELETE_REGIMEN"; payload: string }
  | { type: "ADD_PROVEEDOR"; payload: Proveedor }
  | { type: "UPDATE_PROVEEDOR"; payload: Proveedor }
  | { type: "DELETE_PROVEEDOR"; payload: string };

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------
function catalogReducer(state: CatalogState, action: CatalogAction): CatalogState {
  switch (action.type) {
    // -- Temporada (hard delete) --
    case "ADD_TEMPORADA":
      return { ...state, temporadas: [...state.temporadas, action.payload] };
    case "UPDATE_TEMPORADA":
      return {
        ...state,
        temporadas: state.temporadas.map((e) =>
          e.id === action.payload.id ? action.payload : e,
        ),
      };
    case "DELETE_TEMPORADA":
      return {
        ...state,
        temporadas: state.temporadas.filter((e) => e.id !== action.payload),
      };

    // -- TipoPaquete (hard delete) --
    case "ADD_TIPO_PAQUETE":
      return { ...state, tiposPaquete: [...state.tiposPaquete, action.payload] };
    case "UPDATE_TIPO_PAQUETE":
      return {
        ...state,
        tiposPaquete: state.tiposPaquete.map((e) =>
          e.id === action.payload.id ? action.payload : e,
        ),
      };
    case "DELETE_TIPO_PAQUETE":
      return {
        ...state,
        tiposPaquete: state.tiposPaquete.filter((e) => e.id !== action.payload),
      };

    // -- Etiqueta (hard delete) --
    case "ADD_ETIQUETA":
      return { ...state, etiquetas: [...state.etiquetas, action.payload] };
    case "UPDATE_ETIQUETA":
      return {
        ...state,
        etiquetas: state.etiquetas.map((e) =>
          e.id === action.payload.id ? action.payload : e,
        ),
      };
    case "DELETE_ETIQUETA":
      return {
        ...state,
        etiquetas: state.etiquetas.filter((e) => e.id !== action.payload),
      };

    // -- Pais (hard delete) --
    case "ADD_PAIS":
      return { ...state, paises: [...state.paises, action.payload] };
    case "UPDATE_PAIS":
      return {
        ...state,
        paises: state.paises.map((e) =>
          e.id === action.payload.id ? action.payload : e,
        ),
      };
    case "DELETE_PAIS":
      return {
        ...state,
        paises: state.paises.filter((e) => e.id !== action.payload),
      };

    // -- Ciudad (hard delete) --
    case "ADD_CIUDAD":
      return { ...state, ciudades: [...state.ciudades, action.payload] };
    case "UPDATE_CIUDAD":
      return {
        ...state,
        ciudades: state.ciudades.map((e) =>
          e.id === action.payload.id ? action.payload : e,
        ),
      };
    case "DELETE_CIUDAD":
      return {
        ...state,
        ciudades: state.ciudades.filter((e) => e.id !== action.payload),
      };

    // -- Regimen (hard delete) --
    case "ADD_REGIMEN":
      return { ...state, regimenes: [...state.regimenes, action.payload] };
    case "UPDATE_REGIMEN":
      return {
        ...state,
        regimenes: state.regimenes.map((e) =>
          e.id === action.payload.id ? action.payload : e,
        ),
      };
    case "DELETE_REGIMEN":
      return {
        ...state,
        regimenes: state.regimenes.filter((e) => e.id !== action.payload),
      };

    // -- Proveedor (soft delete) --
    case "ADD_PROVEEDOR":
      return { ...state, proveedores: [...state.proveedores, action.payload] };
    case "UPDATE_PROVEEDOR":
      return {
        ...state,
        proveedores: state.proveedores.map((e) =>
          e.id === action.payload.id ? action.payload : e,
        ),
      };
    case "DELETE_PROVEEDOR":
      return {
        ...state,
        proveedores: state.proveedores.map((e) =>
          e.id === action.payload
            ? { ...e, deletedAt: new Date().toISOString() }
            : e,
        ),
      };

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Contexts (split state / dispatch)
// ---------------------------------------------------------------------------
const CatalogStateContext = createContext<CatalogState | null>(null);
const CatalogDispatchContext = createContext<Dispatch<CatalogAction> | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export function CatalogProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(catalogReducer, initialState);

  return (
    <CatalogStateContext.Provider value={state}>
      <CatalogDispatchContext.Provider value={dispatch}>
        {children}
      </CatalogDispatchContext.Provider>
    </CatalogStateContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Raw state / dispatch hooks
// ---------------------------------------------------------------------------
export function useCatalogState(): CatalogState {
  const ctx = useContext(CatalogStateContext);
  if (!ctx) {
    throw new Error("useCatalogState must be used within a <CatalogProvider>");
  }
  return ctx;
}

export function useCatalogDispatch(): Dispatch<CatalogAction> {
  const ctx = useContext(CatalogDispatchContext);
  if (!ctx) {
    throw new Error("useCatalogDispatch must be used within a <CatalogProvider>");
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Brand-filtered selector hooks
// ---------------------------------------------------------------------------

export function useTemporadas(): Temporada[] {
  const { activeBrandId } = useBrand();
  const state = useCatalogState();
  return useMemo(
    () => state.temporadas.filter((t) => t.brandId === activeBrandId),
    [state.temporadas, activeBrandId],
  );
}

export function useTiposPaquete(): TipoPaquete[] {
  const { activeBrandId } = useBrand();
  const state = useCatalogState();
  return useMemo(
    () => state.tiposPaquete.filter((t) => t.brandId === activeBrandId),
    [state.tiposPaquete, activeBrandId],
  );
}

export function useEtiquetas(): Etiqueta[] {
  const { activeBrandId } = useBrand();
  const state = useCatalogState();
  return useMemo(
    () => state.etiquetas.filter((e) => e.brandId === activeBrandId),
    [state.etiquetas, activeBrandId],
  );
}

export function usePaises(): (Pais & { ciudades: Ciudad[] })[] {
  const { activeBrandId } = useBrand();
  const state = useCatalogState();
  return useMemo(
    () =>
      state.paises
        .filter((p) => p.brandId === activeBrandId)
        .map((p) => ({
          ...p,
          ciudades: state.ciudades.filter((c) => c.paisId === p.id),
        })),
    [state.paises, state.ciudades, activeBrandId],
  );
}

export function useRegimenes(): Regimen[] {
  const { activeBrandId } = useBrand();
  const state = useCatalogState();
  return useMemo(
    () => state.regimenes.filter((r) => r.brandId === activeBrandId),
    [state.regimenes, activeBrandId],
  );
}

export function useProveedores(): Proveedor[] {
  const { activeBrandId } = useBrand();
  const state = useCatalogState();
  return useMemo(
    () =>
      state.proveedores.filter(
        (p) => p.brandId === activeBrandId && !p.deletedAt,
      ),
    [state.proveedores, activeBrandId],
  );
}

// ---------------------------------------------------------------------------
// CRUD action hook
// ---------------------------------------------------------------------------
export function useCatalogActions() {
  const dispatch = useCatalogDispatch();

  return useMemo(
    () => ({
      // -- Temporada --
      createTemporada: (
        data: Omit<Temporada, "id" | "createdAt" | "updatedAt">,
      ): Temporada => {
        const now = new Date().toISOString();
        const entity: Temporada = {
          ...data,
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
        };
        dispatch({ type: "ADD_TEMPORADA", payload: entity });
        return entity;
      },
      updateTemporada: (entity: Temporada) =>
        dispatch({
          type: "UPDATE_TEMPORADA",
          payload: { ...entity, updatedAt: new Date().toISOString() },
        }),
      deleteTemporada: (id: string) =>
        dispatch({ type: "DELETE_TEMPORADA", payload: id }),

      // -- TipoPaquete --
      createTipoPaquete: (
        data: Omit<TipoPaquete, "id" | "createdAt" | "updatedAt">,
      ): TipoPaquete => {
        const now = new Date().toISOString();
        const entity: TipoPaquete = {
          ...data,
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
        };
        dispatch({ type: "ADD_TIPO_PAQUETE", payload: entity });
        return entity;
      },
      updateTipoPaquete: (entity: TipoPaquete) =>
        dispatch({
          type: "UPDATE_TIPO_PAQUETE",
          payload: { ...entity, updatedAt: new Date().toISOString() },
        }),
      deleteTipoPaquete: (id: string) =>
        dispatch({ type: "DELETE_TIPO_PAQUETE", payload: id }),

      // -- Etiqueta --
      createEtiqueta: (
        data: Omit<Etiqueta, "id" | "createdAt" | "updatedAt">,
      ): Etiqueta => {
        const now = new Date().toISOString();
        const entity: Etiqueta = {
          ...data,
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
        };
        dispatch({ type: "ADD_ETIQUETA", payload: entity });
        return entity;
      },
      updateEtiqueta: (entity: Etiqueta) =>
        dispatch({
          type: "UPDATE_ETIQUETA",
          payload: { ...entity, updatedAt: new Date().toISOString() },
        }),
      deleteEtiqueta: (id: string) =>
        dispatch({ type: "DELETE_ETIQUETA", payload: id }),

      // -- Pais --
      createPais: (
        data: Omit<Pais, "id" | "createdAt" | "updatedAt">,
      ): Pais => {
        const now = new Date().toISOString();
        const entity: Pais = {
          ...data,
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
        };
        dispatch({ type: "ADD_PAIS", payload: entity });
        return entity;
      },
      updatePais: (entity: Pais) =>
        dispatch({
          type: "UPDATE_PAIS",
          payload: { ...entity, updatedAt: new Date().toISOString() },
        }),
      deletePais: (id: string) =>
        dispatch({ type: "DELETE_PAIS", payload: id }),

      // -- Ciudad --
      createCiudad: (
        data: Omit<Ciudad, "id" | "createdAt" | "updatedAt">,
      ): Ciudad => {
        const now = new Date().toISOString();
        const entity: Ciudad = {
          ...data,
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
        };
        dispatch({ type: "ADD_CIUDAD", payload: entity });
        return entity;
      },
      updateCiudad: (entity: Ciudad) =>
        dispatch({
          type: "UPDATE_CIUDAD",
          payload: { ...entity, updatedAt: new Date().toISOString() },
        }),
      deleteCiudad: (id: string) =>
        dispatch({ type: "DELETE_CIUDAD", payload: id }),

      // -- Regimen --
      createRegimen: (
        data: Omit<Regimen, "id" | "createdAt" | "updatedAt">,
      ): Regimen => {
        const now = new Date().toISOString();
        const entity: Regimen = {
          ...data,
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
        };
        dispatch({ type: "ADD_REGIMEN", payload: entity });
        return entity;
      },
      updateRegimen: (entity: Regimen) =>
        dispatch({
          type: "UPDATE_REGIMEN",
          payload: { ...entity, updatedAt: new Date().toISOString() },
        }),
      deleteRegimen: (id: string) =>
        dispatch({ type: "DELETE_REGIMEN", payload: id }),

      // -- Proveedor --
      createProveedor: (
        data: Omit<Proveedor, "id" | "createdAt" | "updatedAt" | "deletedAt">,
      ): Proveedor => {
        const now = new Date().toISOString();
        const entity: Proveedor = {
          ...data,
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        };
        dispatch({ type: "ADD_PROVEEDOR", payload: entity });
        return entity;
      },
      updateProveedor: (entity: Proveedor) =>
        dispatch({
          type: "UPDATE_PROVEEDOR",
          payload: { ...entity, updatedAt: new Date().toISOString() },
        }),
      deleteProveedor: (id: string) =>
        dispatch({ type: "DELETE_PROVEEDOR", payload: id }),
    }),
    [dispatch],
  );
}
