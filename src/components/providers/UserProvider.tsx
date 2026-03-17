"use client";

import {
  createContext,
  useContext,
  useReducer,
  useMemo,
  type Dispatch,
} from "react";
import type { AuthUser, Role } from "@/lib/auth";
import { DEMO_USERS } from "@/lib/auth";

// ---------------------------------------------------------------------------
// Actions (discriminated union)
// ---------------------------------------------------------------------------
type UserAction =
  | { type: "ADD_USER"; payload: AuthUser }
  | { type: "UPDATE_USER"; payload: AuthUser }
  | { type: "DELETE_USER"; payload: string };

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------
function userReducer(state: AuthUser[], action: UserAction): AuthUser[] {
  switch (action.type) {
    case "ADD_USER":
      return [...state, action.payload];
    case "UPDATE_USER":
      return state.map((u) => (u.id === action.payload.id ? action.payload : u));
    case "DELETE_USER":
      return state.filter((u) => u.id !== action.payload);
    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Contexts (split state / dispatch)
// ---------------------------------------------------------------------------
const UserStateContext = createContext<AuthUser[] | null>(null);
const UserDispatchContext = createContext<Dispatch<UserAction> | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export function UserProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(userReducer, DEMO_USERS);

  return (
    <UserStateContext.Provider value={state}>
      <UserDispatchContext.Provider value={dispatch}>
        {children}
      </UserDispatchContext.Provider>
    </UserStateContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Raw hooks
// ---------------------------------------------------------------------------
function useUserState(): AuthUser[] {
  const ctx = useContext(UserStateContext);
  if (!ctx) {
    throw new Error("useUserState must be used within a <UserProvider>");
  }
  return ctx;
}

function useUserDispatch(): Dispatch<UserAction> {
  const ctx = useContext(UserDispatchContext);
  if (!ctx) {
    throw new Error("useUserDispatch must be used within a <UserProvider>");
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Public hooks
// ---------------------------------------------------------------------------

/**
 * Returns all users across all brands (not brand-filtered).
 * Only ADMIN users should call this from the Perfiles page.
 */
export function useUsers(): AuthUser[] {
  return useUserState();
}

export function useUserActions() {
  const dispatch = useUserDispatch();

  return useMemo(
    () => ({
      createUser: (data: Omit<AuthUser, "id">): AuthUser => {
        const user: AuthUser = {
          ...data,
          id: crypto.randomUUID(),
        };
        dispatch({ type: "ADD_USER", payload: user });
        return user;
      },
      updateUser: (user: AuthUser): void => {
        dispatch({ type: "UPDATE_USER", payload: user });
      },
      deleteUser: (id: string): void => {
        dispatch({ type: "DELETE_USER", payload: id });
      },
    }),
    [dispatch],
  );
}

// Re-export Role type for convenience
export type { Role };
