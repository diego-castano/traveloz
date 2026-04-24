/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Enable the /instrumentation.ts hook so we can warm the Prisma connection
    // pool on server boot and avoid a slow first-query penalty.
    instrumentationHook: true,
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
