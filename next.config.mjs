/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
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
