"use client";

import {
  SessionProvider,
  useSession,
  signIn,
  signOut,
} from "next-auth/react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
} from "react";
import type { Role, AuthUser } from "@/lib/auth";
import { roleConfig } from "@/lib/auth";

// ---------------------------------------------------------------------------
// Context value interface
// ---------------------------------------------------------------------------
interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isVendedor: boolean;
  canEdit: boolean;
  canSeePricing: { neto: boolean; markup: boolean; venta: boolean };
  visibleModules: string[];
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
const AuthContext = createContext<AuthContextValue | null>(null);

// ---------------------------------------------------------------------------
// Inner provider -- consumes the NextAuth session
// ---------------------------------------------------------------------------
function AuthProviderInner({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();

  const user = useMemo<AuthUser | null>(() => {
    if (!session?.user) return null;
    const u = session.user as any;
    return {
      id: u.id,
      name: u.name || "",
      email: u.email || "",
      role: u.role as Role,
      brandId: u.brandId as string,
    };
  }, [session]);

  // Derive role-based permissions from roleConfig
  const config = user ? roleConfig[user.role] : null;

  const login = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      return !result?.error;
    },
    [],
  );

  const logout = useCallback(async () => {
    await signOut({ redirect: false });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isAdmin: user?.role === "ADMIN",
      isVendedor: user?.role === "VENDEDOR",
      canEdit: config?.canEdit ?? false,
      canSeePricing: config?.canSeePricing ?? {
        neto: false,
        markup: false,
        venta: false,
      },
      visibleModules: config?.visibleModules ?? [],
      login,
      logout,
    }),
    [user, config, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ---------------------------------------------------------------------------
// Provider -- wraps children with NextAuth SessionProvider
// ---------------------------------------------------------------------------
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthProviderInner>{children}</AuthProviderInner>
    </SessionProvider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an <AuthProvider>");
  }
  return ctx;
}
