import { auth } from "@/lib/auth.config";

// Protect /backend/* routes. Public site (/, /destinos, /about, /contact, etc.)
// is open. A few /backend/* routes must stay reachable without auth so
// users can recover access (login, forgot/reset password).
const PUBLIC_BACKEND_ROUTES = new Set([
  "/backend/login",
  "/backend/forgot-password",
  "/backend/reset-password",
]);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  if (PUBLIC_BACKEND_ROUTES.has(pathname)) return;
  if (!req.auth) {
    return Response.redirect(new URL("/backend/login", req.nextUrl.origin));
  }
});

export const config = {
  matcher: ["/backend/:path*"],
};
