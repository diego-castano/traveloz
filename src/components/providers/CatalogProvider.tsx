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
  Temporada,
  TipoPaquete,
  Etiqueta,
  Pais,
  Ciudad,
  Regimen,
  Proveedor,
} from "@/lib/types";
import { useSession } from "next-auth/react";
import * as catalogActions from "@/actions/catalog.actions";
import { useBrand } from "./BrandProvider";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
interface CatalogState {
  loading: boolean;
  temporadas: Temporada[];
  tiposPaquete: TipoPaquete[];
  etiquetas: Etiqueta[];
  paises: Pais[];
  ciudades: Ciudad[];
  regimenes: Regimen[];
  proveedores: Proveedor[];
}

const initialState: CatalogState = {
  loading: true,
  temporadas: [],
  tiposPaquete: [],
  etiquetas: [],
  paises: [],
  ciudades: [],
  regimenes: [],
  proveedores: [],
};

// ---------------------------------------------------------------------------
// Actions (discriminated union)
// ---------------------------------------------------------------------------
type CatalogAction =
  | { type: "SET_ALL"; payload: CatalogState }
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
    case "SET_ALL":
      return { ...action.payload, loading: false };

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
  const { activeBrandId } = useBrand();
  const { status: sessionStatus } = useSession();

  useEffect(() => {
    let cancelled = false;

    // If not authenticated, clear loading and return empty state
    if (sessionStatus !== "authenticated") {
      // Only clear loading after session is determined (not during "loading")
      if (sessionStatus === "unauthenticated") {
        dispatch({
          type: "SET_ALL",
          payload: { ...initialState, loading: false },
        });
      }
      return;
    }

    dispatch({ type: "SET_ALL", payload: { ...initialState, loading: true } });

    catalogActions
      .getAllCatalogs(activeBrandId)
      .then((data) => {
        if (cancelled) return;
        dispatch({
          type: "SET_ALL",
          payload: {
            loading: false,
            temporadas: data.temporadas as unknown as Temporada[],
            tiposPaquete: data.tiposPaquete as unknown as TipoPaquete[],
            etiquetas: data.etiquetas as unknown as Etiqueta[],
            paises: data.paises.map(({ ciudades: _c, ...p }) => p) as unknown as Pais[],
            ciudades: data.paises.flatMap((p) => p.ciudades ?? []) as unknown as Ciudad[],
            regimenes: data.regimenes as unknown as Regimen[],
            proveedores: data.proveedores as unknown as Proveedor[],
          },
        });
      })
      .catch((err) => {
        console.error("Error fetching catalogs:", err);
        if (cancelled) return;
        // IMPORTANT: Always clear loading on error so UI doesn't hang
        dispatch({
          type: "SET_ALL",
          payload: { ...initialState, loading: false },
        });
      });

    return () => {
      cancelled = true;
    };
  }, [activeBrandId, sessionStatus]);

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

export function useCatalogLoading(): boolean {
  return useCatalogState().loading;
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
      createTemporada: async (
        data: Omit<Temporada, "id" | "createdAt" | "updatedAt">,
      ) => {
        const entity = await catalogActions.createTemporada(data);
        dispatch({ type: "ADD_TEMPORADA", payload: entity as unknown as Temporada });
        return entity;
      },
      updateTemporada: async (entity: Temporada) => {
        const { id, ...rest } = entity;
        const updated = await catalogActions.updateTemporada(id, rest);
        dispatch({ type: "UPDATE_TEMPORADA", payload: updated as unknown as Temporada });
        return updated;
      },
      deleteTemporada: async (id: string) => {
        await catalogActions.deleteTemporada(id);
        dispatch({ type: "DELETE_TEMPORADA", payload: id });
      },

      // -- TipoPaquete --
      createTipoPaquete: async (
        data: Omit<TipoPaquete, "id" | "createdAt" | "updatedAt">,
      ) => {
        const entity = await catalogActions.createTipoPaquete(data);
        dispatch({ type: "ADD_TIPO_PAQUETE", payload: entity as unknown as TipoPaquete });
        return entity;
      },
      updateTipoPaquete: async (entity: TipoPaquete) => {
        const { id, ...rest } = entity;
        const updated = await catalogActions.updateTipoPaquete(id, rest);
        dispatch({ type: "UPDATE_TIPO_PAQUETE", payload: updated as unknown as TipoPaquete });
        return updated;
      },
      deleteTipoPaquete: async (id: string) => {
        await catalogActions.deleteTipoPaquete(id);
        dispatch({ type: "DELETE_TIPO_PAQUETE", payload: id });
      },

      // -- Etiqueta --
      createEtiqueta: async (
        data: Omit<Etiqueta, "id" | "createdAt" | "updatedAt">,
      ) => {
        const entity = await catalogActions.createEtiqueta(data);
        dispatch({ type: "ADD_ETIQUETA", payload: entity as unknown as Etiqueta });
        return entity;
      },
      updateEtiqueta: async (entity: Etiqueta) => {
        const { id, ...rest } = entity;
        const updated = await catalogActions.updateEtiqueta(id, rest);
        dispatch({ type: "UPDATE_ETIQUETA", payload: updated as unknown as Etiqueta });
        return updated;
      },
      deleteEtiqueta: async (id: string) => {
        await catalogActions.deleteEtiqueta(id);
        dispatch({ type: "DELETE_ETIQUETA", payload: id });
      },

      // -- Pais --
      createPais: async (
        data: Omit<Pais, "id" | "createdAt" | "updatedAt">,
      ) => {
        const entity = await catalogActions.createPais(data);
        dispatch({ type: "ADD_PAIS", payload: entity as unknown as Pais });
        return entity;
      },
      updatePais: async (entity: Pais) => {
        const { id, ...rest } = entity;
        const updated = await catalogActions.updatePais(id, rest);
        dispatch({ type: "UPDATE_PAIS", payload: updated as unknown as Pais });
        return updated;
      },
      deletePais: async (id: string) => {
        await catalogActions.deletePais(id);
        dispatch({ type: "DELETE_PAIS", payload: id });
      },

      // -- Ciudad --
      createCiudad: async (
        data: Omit<Ciudad, "id" | "createdAt" | "updatedAt">,
      ) => {
        const entity = await catalogActions.createCiudad(data);
        dispatch({ type: "ADD_CIUDAD", payload: entity as unknown as Ciudad });
        return entity;
      },
      updateCiudad: async (entity: Ciudad) => {
        const { id, ...rest } = entity;
        const updated = await catalogActions.updateCiudad(id, rest);
        dispatch({ type: "UPDATE_CIUDAD", payload: updated as unknown as Ciudad });
        return updated;
      },
      deleteCiudad: async (id: string) => {
        await catalogActions.deleteCiudad(id);
        dispatch({ type: "DELETE_CIUDAD", payload: id });
      },

      // -- Regimen --
      createRegimen: async (
        data: Omit<Regimen, "id" | "createdAt" | "updatedAt">,
      ) => {
        const entity = await catalogActions.createRegimen(data);
        dispatch({ type: "ADD_REGIMEN", payload: entity as unknown as Regimen });
        return entity;
      },
      updateRegimen: async (entity: Regimen) => {
        const { id, ...rest } = entity;
        const updated = await catalogActions.updateRegimen(id, rest);
        dispatch({ type: "UPDATE_REGIMEN", payload: updated as unknown as Regimen });
        return updated;
      },
      deleteRegimen: async (id: string) => {
        await catalogActions.deleteRegimen(id);
        dispatch({ type: "DELETE_REGIMEN", payload: id });
      },

      // -- Proveedor --
      createProveedor: async (
        data: Omit<Proveedor, "id" | "createdAt" | "updatedAt" | "deletedAt">,
      ) => {
        const entity = await catalogActions.createProveedor(data as any);
        dispatch({ type: "ADD_PROVEEDOR", payload: entity as unknown as Proveedor });
        return entity;
      },
      updateProveedor: async (entity: Proveedor) => {
        const { id, ...rest } = entity;
        const updated = await catalogActions.updateProveedor(id, rest as any);
        dispatch({ type: "UPDATE_PROVEEDOR", payload: updated as unknown as Proveedor });
        return updated;
      },
      deleteProveedor: async (id: string) => {
        await catalogActions.deleteProveedor(id);
        dispatch({ type: "DELETE_PROVEEDOR", payload: id });
      },
    }),
    [dispatch],
  );
}
