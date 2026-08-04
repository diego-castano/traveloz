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
  const { pathname, search } = req.nextUrl;
  if (PUBLIC_BACKEND_ROUTES.has(pathname)) return;
  if (!req.auth) {
    // Nos guardamos a donde queria ir para devolverlo despues de loguearse.
    // Sin esto, entrar por un link directo (el que mandamos en el aviso de
    // Bitrix, o uno pegado en WhatsApp) terminaba SIEMPRE en el dashboard y el
    // operador tenia que buscar el paquete a mano.
    const login = new URL("/backend/login", req.nextUrl.origin);
    login.searchParams.set("next", `${pathname}${search}`);
    return Response.redirect(login);
  }
});

export const config = {
  matcher: ["/backend/:path*"],
};
