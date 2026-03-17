"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { Role, AuthUser } from "@/lib/auth";
import { roleConfig, DEMO_USERS } from "@/lib/auth";

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
  login: (email: string, password: string) => boolean;
  logout: () => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
const AuthContext = createContext<AuthContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  const login = useCallback((email: string, password: string): boolean => {
    // Simulated login -- password is always "admin"
    if (password !== "admin") return false;

    const found = DEMO_USERS.find(
      (u) => u.email.toLowerCase() === email.toLowerCase(),
    );
    if (!found) return false;

    setUser(found);
    return true;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  // Derive role-based permissions from roleConfig
  const config = user ? roleConfig[user.role] : null;

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
// Hook
// ---------------------------------------------------------------------------
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an <AuthProvider>");
  }
  return ctx;
}
