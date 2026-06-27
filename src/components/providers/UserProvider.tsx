"use client";

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useMemo,
  type Dispatch,
} from "react";
import { useSession } from "next-auth/react";
import type { AuthUser, Role } from "@/lib/auth";
import * as userActions from "@/actions/user.actions";

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
      return { ...state, users: [action.payload, ...state.users] };
    case "UPDATE_USER":
      return {
        ...state,
        users: state.users.map((u) =>
          u.id === action.payload.id ? { ...u, ...action.payload } : u,
        ),
      };
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
  const { status: sessionStatus, data: session } = useSession();
  const role = (session?.user as any)?.role;

  useEffect(() => {
    let cancelled = false;

    if (sessionStatus !== "authenticated") {
      if (sessionStatus === "unauthenticated") {
        dispatch({ type: "SET_ALL", payload: [] });
      }
      return;
    }

    // Only ADMIN can list users — for VENDEDOR/MARKETING this action throws.
    // Skip the fetch entirely so the provider doesn't error out on every
    // non-admin session.
    if (role !== "ADMIN") {
      dispatch({ type: "SET_ALL", payload: [] });
      return;
    }

    userActions
      .getUsers()
      .then((users) => {
        if (cancelled) return;
        dispatch({ type: "SET_ALL", payload: users as AuthUser[] });
      })
      .catch((err) => {
        console.error("Error fetching users:", err);
        if (cancelled) return;
        dispatch({ type: "SET_ALL", payload: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [sessionStatus, role]);

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
      createUser: async (
        data: Omit<AuthUser, "id"> & { password: string; pin?: string; sendInvite?: boolean },
      ) => {
        const result = await userActions.createUser(data);
        if (!result.ok) throw new Error(result.error);
        dispatch({ type: "ADD_USER", payload: result.user as AuthUser });
        return result.user as AuthUser;
      },
      updateUser: async (user: AuthUser) => {
        await userActions.updateUser(user.id, {
          name: user.name,
          email: user.email,
          role: user.role,
          brandId: user.brandId,
          isActive: user.isActive,
        });
        dispatch({ type: "UPDATE_USER", payload: user });
      },
      changePassword: async (userId: string, newPassword: string) => {
        await userActions.updateUserPassword(userId, newPassword);
      },
      setPin: async (userId: string, pin: string | null) => {
        const result = await userActions.adminSetUserPin(userId, pin);
        if (!result.ok) throw new Error(result.error);
        // Patch the cached row so the "tiene PIN" indicator flips immediately.
        // The reducer merges this partial onto the existing row.
        dispatch({
          type: "UPDATE_USER",
          payload: { id: userId, hasPin: !!pin } as AuthUser,
        });
      },
      unlockUser: async (userId: string) => {
        await userActions.unlockUser(userId);
        dispatch({
          type: "UPDATE_USER",
          payload: { id: userId, lockedUntil: null } as AuthUser,
        });
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

export type { Role };
