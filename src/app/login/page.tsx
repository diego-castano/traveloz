"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import Image from "next/image";
import { useAuth } from "@/components/providers/AuthProvider";
import { useBrand } from "@/components/providers/BrandProvider";
import { glassMaterials } from "@/components/lib/glass";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

// ---------------------------------------------------------------------------
// Noise overlay SVG from design.json glass.noise.backgroundSvg
// ---------------------------------------------------------------------------
const NOISE_SVG =
  "data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E";

// ---------------------------------------------------------------------------
// Login page entrance animation from design.json patterns.loginPage.card.entranceAnimation
// ---------------------------------------------------------------------------
const cardEntrance = {
  initial: { opacity: 0, y: 40, scale: 0.9, filter: "blur(10px)" },
  animate: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" },
  transition: {
    type: "spring" as const,
    stiffness: 200,
    damping: 22,
    delay: 0.2,
  },
};

// ---------------------------------------------------------------------------
// Elevation-32 shadow from design.json shadows
// ---------------------------------------------------------------------------
const ELEVATION_32 =
  "0 32px 64px -12px rgba(26,26,46,0.15), 0 12px 24px -8px rgba(26,26,46,0.08)";

// ---------------------------------------------------------------------------
// Login Page Component
// ---------------------------------------------------------------------------
export default function LoginPage() {
  const auth = useAuth();
  const { activeBrand } = useBrand();
  const router = useRouter();

  // Redirect if already authenticated
  if (auth.isAuthenticated) {
    router.push("/");
    return null;
  }

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const success = auth.login(email, password);
    if (success) {
      router.push("/");
    } else {
      setError("Email o contrasena incorrectos");
      setLoading(false);
    }
  };

  /** Quick-select demo credential */
  const fillDemoUser = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("admin");
    setError("");
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
      {/* ----------------------------------------------------------------- */}
      {/* Mesh gradient background -- brand-specific from BrandProvider     */}
      {/* ----------------------------------------------------------------- */}
      <div
        className="absolute inset-0 animate-mesh-float"
        style={{ background: activeBrand.loginBackground }}
      />

      {/* ----------------------------------------------------------------- */}
      {/* SVG noise overlay at 2.5% opacity                                 */}
      {/* ----------------------------------------------------------------- */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: 0.025,
          mixBlendMode: "overlay",
          backgroundImage: `url("${NOISE_SVG}")`,
          backgroundRepeat: "repeat",
        }}
      />

      {/* ----------------------------------------------------------------- */}
      {/* Login card -- liquid glass material with spring entrance          */}
      {/* ----------------------------------------------------------------- */}
      <motion.div
        className="relative z-10 flex flex-col items-center"
        initial={cardEntrance.initial}
        animate={cardEntrance.animate}
        transition={cardEntrance.transition}
      >
        {/* Logo -- outside the card, over the background */}
        <div className="mb-6">
          <Image
            src="/header-logo.webp"
            alt={activeBrand.name}
            width={180}
            height={54}
            className="object-contain drop-shadow-lg"
          />
        </div>

        {/* Card */}
        <div
          className="relative w-[420px]"
          style={{
            ...glassMaterials.liquid,
            padding: 40,
            borderRadius: 24,
            boxShadow: ELEVATION_32,
          }}
        >
        {/* Top accent line */}
        <div
          className="absolute inset-x-0 top-0 h-[2px] rounded-t-[24px]"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(139,92,246,0.2), rgba(59,191,173,0.15), transparent)",
          }}
        />

        {/* Title */}
        <h1 className="mt-2 text-center font-display text-[28px] font-bold text-neutral-900">
          Bienvenido
        </h1>

        {/* Subtitle */}
        <p className="mt-1 text-center text-sm text-neutral-600">
          Ingresa tus credenciales para continuar
        </p>

        {/* Form */}
        <form onSubmit={handleLogin} className="mt-8 flex flex-col gap-4">
          <Input
            label="Email"
            type="email"
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />

          <Input
            label="Contrasena"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />

          {/* Error message */}
          {error && (
            <p className="text-sm text-brand-red-500 mt-2 text-center">
              {error}
            </p>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full mt-6"
            loading={loading}
          >
            Ingresar
          </Button>
        </form>

        {/* Demo credential quick-select */}
        <div className="mt-6 border-t border-neutral-300/60 pt-4">
          <p className="text-xs text-neutral-600 font-medium text-center mb-2">
            Acceso rapido demo
          </p>
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => fillDemoUser("geronimo@traveloz.com.uy")}
              className="text-xs text-neutral-700 hover:text-brand-violet-600 transition-colors text-left px-2 py-1 rounded hover:bg-neutral-100/60"
            >
              geronimo@traveloz.com.uy - Admin TravelOz
            </button>
            <button
              type="button"
              onClick={() => fillDemoUser("ventas@traveloz.com.uy")}
              className="text-xs text-neutral-700 hover:text-brand-violet-600 transition-colors text-left px-2 py-1 rounded hover:bg-neutral-100/60"
            >
              ventas@traveloz.com.uy - Vendedor TravelOz
            </button>
            <button
              type="button"
              onClick={() => fillDemoUser("admin@destinoicono.com")}
              className="text-xs text-neutral-700 hover:text-brand-violet-600 transition-colors text-left px-2 py-1 rounded hover:bg-neutral-100/60"
            >
              admin@destinoicono.com - Admin DestinoIcono
            </button>
          </div>
          <p className="text-[10px] text-white/40 text-center mt-2">
            Password para todos: admin
          </p>
        </div>
        </div>
      </motion.div>
    </div>
  );
}
