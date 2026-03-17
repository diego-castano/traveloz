// ---------------------------------------------------------------------------
// Auth types, role permission configs, and demo users
// Source: docs/design.json roles section + PROMPT_CLAUDE_CODE.md users
// ---------------------------------------------------------------------------

export type Role = "ADMIN" | "VENDEDOR" | "MARKETING";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  brandId: string;
}

export interface RoleConfig {
  canEdit: boolean;
  canSeePricing: { neto: boolean; markup: boolean; venta: boolean };
  visibleModules: string[];
}

export const roleConfig: Record<Role, RoleConfig> = {
  ADMIN: {
    canEdit: true,
    canSeePricing: { neto: true, markup: true, venta: true },
    visibleModules: [
      "dashboard",
      "paquetes",
      "aereos",
      "alojamientos",
      "traslados",
      "circuitos",
      "seguros",
      "proveedores",
      "catalogos",
      "perfiles",
      "notificaciones",
      "reportes",
    ],
  },
  VENDEDOR: {
    canEdit: false,
    canSeePricing: { neto: false, markup: false, venta: true },
    visibleModules: ["paquetes"],
  },
  MARKETING: {
    canEdit: false,
    canSeePricing: { neto: false, markup: false, venta: true },
    visibleModules: ["paquetes", "reportes"],
  },
} as const;

// ---------------------------------------------------------------------------
// Demo users for simulated login (password: "admin" for all)
// ---------------------------------------------------------------------------
export const DEMO_USERS: AuthUser[] = [
  {
    id: "user-1",
    name: "Geronimo Cassoni",
    email: "geronimo@traveloz.com.uy",
    role: "ADMIN",
    brandId: "brand-1",
  },
  {
    id: "user-2",
    name: "Santiago Rodriguez",
    email: "santiago@traveloz.com.uy",
    role: "ADMIN",
    brandId: "brand-1",
  },
  {
    id: "user-3",
    name: "Equipo Ventas TravelOz",
    email: "ventas@traveloz.com.uy",
    role: "VENDEDOR",
    brandId: "brand-1",
  },
  {
    id: "user-4",
    name: "Admin DestinoIcono",
    email: "admin@destinoicono.com",
    role: "ADMIN",
    brandId: "brand-2",
  },
  {
    id: "user-5",
    name: "Equipo Ventas DestinoIcono",
    email: "ventas@destinoicono.com",
    role: "VENDEDOR",
    brandId: "brand-2",
  },
];
