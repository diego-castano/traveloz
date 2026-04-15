import { auth } from "@/lib/auth.config";

export default auth((req) => {
  if (!req.auth && !req.nextUrl.pathname.startsWith("/login")) {
    return Response.redirect(new URL("/login", req.nextUrl.origin));
  }
});

export const config = {
  matcher: [
    // Exclude API auth, login, Next internals, favicon, public asset dirs,
    // and any file with an extension (images, fonts, manifests, etc.) so the
    // auth redirect doesn't intercept /header-logo.webp and similar assets.
    "/((?!api/auth|login|_next/static|_next/image|favicon.ico|assets|presentacion_traveloz|.*\\..*).*)",
  ],
};
