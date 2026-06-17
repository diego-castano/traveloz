const isDev = process.env.NODE_ENV !== "production";

// Content-Security-Policy. Next.js requiere 'unsafe-inline' para sus scripts
// de hidratación (sin nonces) y 'unsafe-eval' solo en dev (react-refresh).
// frame-src permite el embed de Google Maps editable desde el CMS
// (contacto_mapa_embed); frame-ancestors 'self' habilita el live preview
// del admin (/backend/web) que iframea el sitio público.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https:",
  "frame-src 'self' https://www.google.com https://maps.google.com",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

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
  },
  eslint: {
    // Ahora existe `.eslintrc.json`, así que `npm run lint` corre. Pero el
    // código nunca se linteó (291 archivos), así que dejamos que `next build`
    // NO falle por lint para no bloquear el deploy. Quitar este flag cuando se
    // limpien los hallazgos de `npm run lint`.
    ignoreDuringBuilds: true,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
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
