import type { DefaultSession } from "next-auth";

// ---------------------------------------------------------------------------
// Forma real de la sesión de Traveloz.
//
// Los campos los pone `toSessionUser` (src/lib/auth.config.ts) al autenticar y
// los propagan los callbacks jwt → session. Buena parte del código viejo los
// lee con `as any`; esta ampliación existe para que el código nuevo (el gate de
// primer ingreso) los pueda leer tipado sin castear.
// ---------------------------------------------------------------------------

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      brandId: string;
      isActive?: boolean;
      /** Entró con contraseña temporal y todavía no eligió qué hacer. */
      mustChangePassword?: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    brandId?: string;
    mustChangePassword?: boolean;
  }
}

export {};
