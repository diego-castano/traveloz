"use client";

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useMemo,
  type Dispatch,
} from "react";
import type { AuthUser, Role } from "@/lib/auth";
import * as userActions from '@/actions/user.actions';

// ---------------------------------------------------------------------------
// Actions (discriminated union)
// ---------------------------------------------------------------------------
type UserAction =
  | { type: "SET_ALL"; payload: AuthUser[] }
  | { type: "ADD_USER"; payload: AuthUser }
  | { type: "UPDATE_USER"; payload: AuthUser }
  | { type: "DELETE_USER"; payload: string };

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------
interface UserState {
  users: AuthUser[];
  loading: boolean;
}

function userReducer(state: UserState, action: UserAction): UserState {
  switch (action.type) {
    case "SET_ALL":
      return { users: action.payload, loading: false };
    case "ADD_USER":
      return { ...state, users: [...state.users, action.payload] };
    case "UPDATE_USER":
      return { ...state, users: state.users.map((u) => (u.id === action.payload.id ? action.payload : u)) };
    case "DELETE_USER":
      return { ...state, users: state.users.filter((u) => u.id !== action.payload) };
    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Contexts (split state / dispatch)
// ---------------------------------------------------------------------------
const UserStateContext = createContext<UserState | null>(null);
const UserDispatchContext = createContext<Dispatch<UserAction> | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export function UserProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(userReducer, { users: [], loading: true });

  useEffect(() => {
    let cancelled = false;
    userActions.getUsers().then((users) => {
      if (cancelled) return;
      dispatch({ type: "SET_ALL", payload: users });
    }).catch(console.error);
    return () => { cancelled = true; };
  }, []);

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
function useUserState(): UserState {
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
  return useUserState().users;
}

export function useUserLoading(): boolean {
  return useUserState().loading;
}

export function useUserActions() {
  const dispatch = useUserDispatch();

  return useMemo(
    () => ({
      createUser: async (data: Omit<AuthUser, "id"> & { password: string }) => {
        const entity = await userActions.createUser({ ...data, password: data.password });
        dispatch({ type: "ADD_USER", payload: entity as any });
        return entity as any;
      },
      updateUser: async (user: AuthUser & { isActive?: boolean }) => {
        await userActions.updateUser(user.id, user);
        dispatch({ type: "UPDATE_USER", payload: user });
      },
      changePassword: async (userId: string, newPassword: string) => {
        await userActions.updateUserPassword(userId, newPassword);
      },
      deleteUser: async (id: string) => {
        await userActions.deleteUser(id);
        dispatch({ type: "DELETE_USER", payload: id });
      },
      checkEmailAvailable: async (email: string) => {
        return userActions.checkEmailAvailable(email);
      },
    }),
    [dispatch],
  );
}

// Re-export Role type for convenience
export type { Role };
