import { auth } from "@/lib/auth.config";

// Protect /backend/* routes (except /backend/login). Public site (/, /destinos,
// /about, /contact, etc.) is open. Matcher restricts execution to /backend/*.
export default auth((req) => {
  const { pathname } = req.nextUrl;
  if (pathname === "/backend/login") return;
  if (!req.auth) {
    return Response.redirect(new URL("/backend/login", req.nextUrl.origin));
  }
});

export const config = {
  matcher: ["/backend/:path*"],
};
