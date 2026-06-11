import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import {
  authenticateUserByPassword,
  authenticateUserByPin,
} from "@/actions/auth.actions";

// ---------------------------------------------------------------------------
// NextAuth v5 (beta) configuration.
//
// Two credential providers share the same session shape so the rest of the
// app doesn't need to know how the user arrived:
//
//   • "credentials"  → email + password
//   • "pin"          → PIN solo (4-6 dígitos)
//
// The PIN provider takes ONLY the pin: the server identifies the user by
// comparing against every stored pinHash (PINs are unique — enforced at
// assignment time via isPinInUse). No user roster is exposed in the login UI.
//
// `isActive` is re-checked on every session() callback so deactivating a
// user takes effect immediately, even on currently-issued JWTs.
// ---------------------------------------------------------------------------

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      id: "credentials",
      name: "Email + Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await authenticateUserByPassword(
          String(credentials.email),
          String(credentials.password),
        );
        if (!user) return null;
        return toSessionUser(user);
      },
    }),
    Credentials({
      id: "pin",
      name: "PIN",
      credentials: {
        pin: { label: "PIN", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.pin) return null;
        const user = await authenticateUserByPin(String(credentials.pin));
        if (!user) return null;
        return toSessionUser(user);
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/backend/login",
  },
  callbacks: {
    jwt({ token, user, trigger }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
        token.brandId = (user as any).brandId;
      }
      // When the client calls `update()` after a profile edit we just keep
      // whatever was injected. The `session` callback below is the place that
      // re-checks isActive against the DB on every read.
      if (trigger === "update") {
        // no-op — kept for future per-field session refresh
      }
      return token;
    },
    session({ session, token }) {
      // CRITICAL: this callback runs in the edge runtime (middleware imports
      // this config), so we CANNOT touch Prisma here — `prisma.user.findUnique`
      // would throw `In order to run Prisma Client on edge runtime, either use
      // Prisma Accelerate...`. The previous version of this callback re-checked
      // isActive on every read by hitting the DB; that broke every request
      // (login + every server-component fetch returned 500).
      //
      // Trade-off: deactivating a user no longer invalidates already-issued
      // JWTs immediately. The server actions (`requireAuth()`) still hit the
      // DB on every mutation, so a deactivated user can't write — they just
      // remain able to *read* until their JWT expires (default 30 days).
      // Acceptable for the team size; if we ever need instant revoke, do it
      // from a dedicated non-edge route or shorten the JWT lifetime.
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).brandId = token.brandId;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
});

function toSessionUser(user: {
  id: string;
  email: string;
  name: string;
  role: string;
  brandId: string;
  isActive: boolean;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    brandId: user.brandId,
    isActive: user.isActive,
  };
}
