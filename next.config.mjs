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

// Variante para el link publico de cotizacion (/c/:path*). RESTA lo que ahi no
// pinta nada: GTM, Google Analytics, Facebook Pixel y Metricool. La hoja del
// pasajero no mide nada — cuanto abrio y hasta donde bajo lo registra nuestro
// propio beacon (/api/cotizador/apertura) — y en esa pagina hay nombre,
// itinerario y precio de una persona: no tiene por que pasar por un tercero.
// 'self' y 'unsafe-inline' se quedan porque Next inyecta sus scripts de
// hidratacion inline y sin nonce.
//
// Hasta 2026-08 existia ademas una CSP propia para todo /backend/* que abria
// fonts.googleapis.com y fonts.gstatic.com, porque el CSS del cotizador traia
// un @import a Google Fonts. Las tres familias ahora se sirven desde
// public/fonts/cotizador (ver styles.js), asi que 'self' alcanza y el panel
// vuelve a la CSP del sitio.
const cspPublicoCotizacion = csp
  .replace(
    /script-src [^;]+/,
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  )
  // Sin pixel no hace falta el iframe ni el POST de fallback a facebook.com, y
  // esta pagina no embebe mapas: se cierran las dos puertas.
  .replace(/frame-src [^;]+/, "frame-src 'none'")
  .replace(/form-action [^;]+/, "form-action 'self'");

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
    // puppeteer-core solo lo usa el server (src/lib/pdf.ts, la ruta del PDF y
    // la action del email). Se marca como externo para que webpack no intente
    // empaquetarlo: adentro tiene requires dinámicos y un `import()` opcional
    // de Playwright que en el bundle terminan en warnings o en un módulo roto.
    serverComponentsExternalPackages: ["puppeteer-core"],
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
        // Restos estaticos que no son el sitio: la plantilla original
        // (html_inicial), los mockups del panel y la presentacion del backend.
        // Se sirven desde public/, asi que son URLs publicas de verdad y Google
        // las tenia indexadas: aparecian entre los sitelinks de "traveloz" con
        // titulos inventados ("Logo", "Nosotros Cotizacion Paquetes"), porque
        // robots.txt le prohibia leerlas y solo conocia la URL.
        //
        // Bloquear por robots era justamente el problema: sin poder rastrear la
        // pagina, Google nunca ve un noindex y la URL se queda en el indice.
        // Ahora se deja rastrear (ver robots.ts) y se responde noindex, que es
        // lo unico que la saca. (Reporte de Gero, 01/09.)
        source: "/:ruta(html_inicial|mockups|presentacion_traveloz)/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        // Links públicos de cotización (/c/<token>). La pagina monta la misma
        // ficha del pasajero que el cotizador y le inyecta el MISMO CSS. Lo que
        // esta CSP recorta son los origenes de medicion (GTM, GA, Facebook,
        // Metricool): ver cspPublicoCotizacion.
        source: "/c/:path*",
        headers: [
          { key: "Content-Security-Policy", value: cspPublicoCotizacion },
        ],
      },
      {
        // Tipografías del cotizador (public/fonts/cotizador/*.woff2). El nombre
        // del archivo lleva la version de gstatic (dm-sans-v17…), asi que
        // actualizar una fuente crea una URL nueva: por eso se puede ir a un
        // año e immutable sin quedar clavado con una version vieja en caché.
        source: "/fonts/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
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
