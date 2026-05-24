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
//   • "pin"          → userId + PIN (4-6 dígitos)
//
// The PIN provider takes userId (not email) because the login UI shows a
// roster of users to tap before asking for the PIN — that lookup is cheaper
// and lets us scope lockouts/audit per known user even when only the PIN was
// entered.
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
        userId: { label: "User ID", type: "text" },
        pin: { label: "PIN", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.userId || !credentials?.pin) return null;
        const user = await authenticateUserByPin(
          String(credentials.userId),
          String(credentials.pin),
        );
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
    async session({ session, token }) {
      if (!session.user) return session;

      // Re-verify the user is still active on every session read. If the
      // admin flipped isActive=false (or deleted the user) since the JWT was
      // issued, kill the session right here.
      const { prisma } = await import("@/lib/db");
      const dbUser = await prisma.user.findUnique({
        where: { id: token.id as string },
        select: { id: true, isActive: true, role: true, brandId: true, name: true, email: true },
      });

      if (!dbUser || !dbUser.isActive) {
        // Returning a session with no user.id forces middleware/guards to
        // treat the request as unauthenticated.
        return { ...session, user: undefined as any };
      }

      (session.user as any).id = dbUser.id;
      (session.user as any).role = dbUser.role;
      (session.user as any).brandId = dbUser.brandId;
      session.user.name = dbUser.name;
      session.user.email = dbUser.email;
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
