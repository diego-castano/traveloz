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
    // Mandamos al login del MISMO host por el que entro el usuario.
    //
    // NO usamos `req.nextUrl.origin`: el wrapper `auth()` de next-auth v5
    // reescribe la URL del request con NEXTAUTH_URL (`reqWithEnvURL`), asi que
    // ese origin es el del dominio configurado y no el host real, y trustHost
    // no lo evita. Por eso al cliente, que trabaja en
    // traveloz-production.up.railway.app, se lo tiraba a traveloz.com.uy/backend/login,
    // un host donde su cookie de sesion no existe: quedaba deslogueado.
    //
    // Los headers si sobreviven la reescritura, asi que el host sale de ahi.
    // Tampoco sirve un Location relativo: el adapter de middleware de Next lo
    // parsea con `new NextURL(...)` y revienta con "Invalid URL".
    const host =
      req.headers.get("x-forwarded-host") ??
      req.headers.get("host") ??
      req.nextUrl.host;
    const proto =
      req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "");
    const login = new URL("/backend/login", `${proto}://${host}`);
    login.searchParams.set("next", `${pathname}${search}`);
    return Response.redirect(login);
  }
});

export const config = {
  matcher: ["/backend/:path*"],
};
