"use client";

// ---------------------------------------------------------------------------
// Admin background with color orbs and SVG noise overlay
// Source: design.json semantic.backgroundOrbs + glass.noise
// CRITICAL: pointer-events: none on root prevents click interception (pitfall 5)
// ---------------------------------------------------------------------------
export function AdminBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0">
      {/* Base color -- #F5F6FA */}
      <div className="absolute inset-0 bg-surface-page" />

      {/* Orb 1 (teal, top-right) -- design.json semantic.backgroundOrbs[0] */}
      <div
        className="absolute rounded-full"
        style={{
          width: "600px",
          height: "600px",
          top: "10%",
          right: "15%",
          background: "rgba(59,191,173,0.06)",
          filter: "blur(120px)",
        }}
      />

      {/* Orb 2 (violet, bottom-left) -- design.json semantic.backgroundOrbs[1] */}
      <div
        className="absolute rounded-full"
        style={{
          width: "500px",
          height: "500px",
          bottom: "15%",
          left: "15%",
          background: "rgba(139,92,246,0.05)",
          filter: "blur(100px)",
        }}
      />

      {/* Orb 3 (violet subtle, center) -- design.json semantic.backgroundOrbs[2] */}
      <div
        className="absolute rounded-full"
        style={{
          width: "400px",
          height: "400px",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background: "rgba(139,92,246,0.03)",
          filter: "blur(80px)",
        }}
      />

      {/* SVG noise overlay -- design.json glass.noise */}
      <div
        className="absolute inset-0"
        style={{
          opacity: 0.025,
          mixBlendMode: "overlay",
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
        }}
      />
    </div>
  );
}
