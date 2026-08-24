const isDev = process.env.NODE_ENV !== "production";

// Content-Security-Policy. Next.js requiere 'unsafe-inline' para sus scripts
// de hidratación (sin nonces) y 'unsafe-eval' solo en dev (react-refresh).
// frame-src permite el embed de Google Maps editable desde el CMS
// (contacto_mapa_embed); frame-ancestors 'self' habilita el live preview
// del admin (/backend/web) que iframea el sitio público.
const csp = [
  "default-src 'self'",
  // Google Tag Manager / GA carga gtm.js y librerías GA desde estos orígenes.
  // El contenedor GTM (GTM-NLVNKHRK) además dispara Facebook Pixel
  // (connect.facebook.net) y Metricool (tracker.metricool.com) — configurados
  // en el panel de GTM, no en el repo; sin estos orígenes la CSP los bloquea.
  // connect-src e img-src ya permiten https: (beacons de todos ellos).
  `script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://*.googletagmanager.com https://www.google-analytics.com https://*.google-analytics.com https://connect.facebook.net https://tracker.metricool.com${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https:",
  // www.facebook.com en frame-src y form-action: el pixel de Meta (vía GTM)
  // usa un iframe y un POST de formulario a facebook.com/tr como fallback de
  // entrega; sin estos orígenes la CSP los bloquea y el pixel no mide.
  "frame-src 'self' https://www.google.com https://maps.google.com https://www.facebook.com",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self' https://www.facebook.com",
  "object-src 'none'",
].join("; ");

// Variante de la CSP para todo el panel (/backend/*): suma los dos origenes de
// Google Fonts. Todo lo demas queda igual que la CSP del sitio publico.
const cspBackend = csp
  .replace(
    "style-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  )
  .replace("font-src 'self' data:", "font-src 'self' data: https://fonts.gstatic.com");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  ...(isDev
    ? []
    : [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains",
        },
      ]),
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Enable the /instrumentation.ts hook so we can warm the Prisma connection
    // pool on server boot and avoid a slow first-query penalty.
    instrumentationHook: true,
    serverActions: {
      // El autosave del cotizador manda la cotización entera en cada guardado:
      // notas del pasajero con formato, itinerario y opciones. Con el default
      // de 1 MB una cotización larga rebotaba y el editor quedaba sin guardar.
      // Las imágenes ya no viajan adentro (van a /api/upload y queda la URL).
      bodySizeLimit: "2mb",
    },
  },
  eslint: {
    // Ahora existe `.eslintrc.json`, así que `npm run lint` corre. Pero el
    // código nunca se linteó (291 archivos), así que dejamos que `next build`
    // NO falle por lint para no bloquear el deploy. Quitar este flag cuando se
    // limpien los hallazgos de `npm run lint`.
    ignoreDuringBuilds: true,
  },
  async redirects() {
    return [
      {
        // app.traveloz.com.uy fue el dominio de desarrollo y sigue colgado del
        // servicio en Railway (ademas es el dominio de envio de Resend, que
        // vive en DNS y no se ve afectado por esto). Cualquier visita web ahi
        // rebota al dominio real conservando la ruta, asi los bookmarks, el
        // historial y los links de emails viejos dejan de dispersar sesiones.
        source: "/:path*",
        has: [{ type: "host", value: "app.traveloz.com.uy" }],
        destination: "https://traveloz.com.uy/:path*",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        // Panel entero (/backend/*). El cotizador trae su CSS embebido con un
        // @import a Google Fonts (DM Sans, Playfair Display, JetBrains Mono) y
        // la CSP del sitio no permite esos origenes. La CSP la fija el
        // documento, no la ruta que se pinta: si el usuario entra por
        // /backend/dashboard y navega client-side al cotizador, sigue rigiendo
        // la CSP del documento inicial. Por eso la ampliacion cubre todo el
        // panel y no solo /backend/cotizador.
        // Va DESPUES de la catch-all a proposito: ante la misma clave gana la
        // ultima entrada que matchea, asi que /backend/* recibe esta CSP y el
        // sitio publico queda con la del sitio. El resto de los headers de
        // seguridad (nosniff, X-Frame-Options, Referrer-Policy,
        // Permissions-Policy, HSTS) los sigue aportando la catch-all: el merge
        // es por clave, no reemplaza el bloque entero.
        source: "/backend/:path*",
        headers: [
          { key: "Content-Security-Policy", value: cspBackend },
        ],
      },
      {
        // Assets estáticos del template (css/js/fonts/img/video). No tienen
        // hash en el nombre, así que no usamos immutable: 1 día de cache +
        // una semana de stale-while-revalidate.
        source: "/site/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
      {
        source: "/header-logo.webp",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/presentacion_traveloz",
        destination: "/presentacion_traveloz/index.html",
      },
    ];
  },
};

export default nextConfig;
