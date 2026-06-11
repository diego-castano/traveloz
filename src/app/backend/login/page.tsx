"use client";

import { Suspense, useCallback, useEffect, useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useBrand } from "@/components/providers/BrandProvider";
import { glassMaterials } from "@/components/lib/glass";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const NOISE_SVG =
  "data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E";

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

const ELEVATION_32 =
  "0 32px 64px -12px rgba(26,26,46,0.15), 0 12px 24px -8px rgba(26,26,46,0.08)";

type Mode = "password" | "pin";

function LoginTransition({ background }: { background: string }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0 animate-mesh-float"
        style={{ background }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: 0.025,
          mixBlendMode: "overlay",
          backgroundImage: `url("${NOISE_SVG}")`,
          backgroundRepeat: "repeat",
        }}
      />
      <motion.div
        className="relative z-10 flex flex-col items-center gap-5"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        <div
          className="flex items-center justify-center rounded-full"
          style={{
            ...glassMaterials.liquid,
            width: 72,
            height: 72,
            boxShadow: ELEVATION_32,
          }}
        >
          <Loader2 className="h-7 w-7 animate-spin text-brand-violet-600" />
        </div>
        <p className="text-sm font-medium text-white drop-shadow-sm">
          Preparando tu panel…
        </p>
      </motion.div>
    </div>
  );
}

function LoginPageInner() {
  const auth = useAuth();
  const { activeBrand } = useBrand();
  const router = useRouter();
  const search = useSearchParams();

  const justReset = search?.get("reset") === "success";

  const [mode, setMode] = useState<Mode>("password");

  // ── Password mode state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  // ── PIN mode state (PIN-only: el sistema identifica al usuario por su PIN)
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinLoading, setPinLoading] = useState(false);

  // True while we hand off to /backend/dashboard. Shown as a full-screen loader
  // so the user doesn't see a blank page while the next segment compiles/mounts.
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (auth.isAuthenticated) {
      setRedirecting(true);
      router.push("/backend/dashboard");
    }
  }, [auth.isAuthenticated, router]);

  if (redirecting || auth.isAuthenticated) {
    return <LoginTransition background={activeBrand.loginBackground} />;
  }

  const handlePasswordLogin = async (e: FormEvent) => {
    e.preventDefault();
    setPwError("");
    setPwLoading(true);
    const success = await auth.login(email, password);
    if (success) {
      setRedirecting(true);
      router.push("/backend/dashboard");
    } else {
      setPwError("Email o contraseña incorrectos");
      setPwLoading(false);
    }
  };

  const handlePinLogin = async (e: FormEvent) => {
    e.preventDefault();
    setPinError("");
    setPinLoading(true);
    const res = await signIn("pin", {
      pin,
      redirect: false,
    });
    if (res?.error) {
      setPinError("PIN incorrecto");
      setPinLoading(false);
      return;
    }
    setRedirecting(true);
    router.push("/backend/dashboard");
  };

  const fillDemoUser = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("admin");
    setPwError("");
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0 animate-mesh-float"
        style={{ background: activeBrand.loginBackground }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: 0.025,
          mixBlendMode: "overlay",
          backgroundImage: `url("${NOISE_SVG}")`,
          backgroundRepeat: "repeat",
        }}
      />

      <motion.div
        className="relative z-10 flex flex-col items-center"
        initial={cardEntrance.initial}
        animate={cardEntrance.animate}
        transition={cardEntrance.transition}
      >
        <div className="mb-6">
          <Image
            src="/header-logo.webp"
            alt={activeBrand.name}
            width={180}
            height={54}
            className="object-contain drop-shadow-lg"
            unoptimized
          />
        </div>

        <div
          className="relative w-[440px]"
          style={{
            ...glassMaterials.liquid,
            padding: 40,
            borderRadius: 24,
            boxShadow: ELEVATION_32,
          }}
        >
          <div
            className="absolute inset-x-0 top-0 h-[2px] rounded-t-[24px]"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(139,92,246,0.2), rgba(59,191,173,0.15), transparent)",
            }}
          />

          <h1 className="mt-2 text-center font-display text-[28px] font-bold text-neutral-900">
            Bienvenido
          </h1>
          <p className="mt-1 text-center text-sm text-neutral-600">
            {mode === "password"
              ? "Ingresá tus credenciales para continuar"
              : "Ingresá tu PIN para entrar"}
          </p>

          {justReset && (
            <p className="mt-3 rounded-lg bg-emerald-50/80 px-3 py-2 text-center text-xs text-emerald-700">
              Contraseña actualizada. Ingresá con tus nuevos datos.
            </p>
          )}

          {/* Mode switcher */}
          <div className="mt-6 flex rounded-full bg-neutral-100/80 p-1 text-xs font-medium">
            <button
              type="button"
              onClick={() => {
                setMode("password");
                setPin("");
                setPinError("");
              }}
              className={`flex-1 rounded-full px-3 py-1.5 transition-colors ${
                mode === "password"
                  ? "bg-white text-neutral-800 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-700"
              }`}
            >
              Email + Contraseña
            </button>
            <button
              type="button"
              onClick={() => setMode("pin")}
              className={`flex-1 rounded-full px-3 py-1.5 transition-colors ${
                mode === "pin"
                  ? "bg-white text-neutral-800 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-700"
              }`}
            >
              PIN rápido
            </button>
          </div>

          <AnimatePresence mode="wait">
            {mode === "password" ? (
              <motion.div
                key="password"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
              >
                <form onSubmit={handlePasswordLogin} className="mt-6 flex flex-col gap-4">
                  <Input
                    label="Email"
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                  <Input
                    label="Contraseña"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                  {pwError && (
                    <p className="text-sm text-brand-red-500 mt-2 text-center">{pwError}</p>
                  )}
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full mt-4"
                    loading={pwLoading}
                  >
                    Ingresar
                  </Button>
                  <Link
                    href="/backend/forgot-password"
                    className="text-center text-xs text-neutral-500 hover:text-brand-violet-600"
                  >
                    Olvidé mi contraseña
                  </Link>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="pin"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
              >
                <form onSubmit={handlePinLogin} className="mt-6 flex flex-col gap-4">
                  <Input
                    label="PIN"
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="••••"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                    autoFocus
                    autoComplete="off"
                  />
                  <p className="text-center text-xs text-neutral-400">
                    Tu PIN te identifica — no hace falta elegir usuario.
                  </p>
                  {pinError && (
                    <p className="text-sm text-brand-red-500 text-center">{pinError}</p>
                  )}
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full mt-2"
                    loading={pinLoading}
                    disabled={pin.length < 4}
                  >
                    Ingresar con PIN
                  </Button>
                  <p className="text-center text-[11px] text-neutral-400">
                    ¿Sin PIN? Ingresá con email + contraseña y activalo desde{" "}
                    <em>Mi perfil</em>.
                  </p>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Demo credential quick-select (dev only) */}
          {process.env.NODE_ENV === "development" && mode === "password" && (
            <div className="mt-6 border-t border-neutral-300/60 pt-4">
              <p className="text-xs text-neutral-600 font-medium text-center mb-2">
                Acceso rápido demo
              </p>
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => fillDemoUser("geronimo@traveloz.com.uy")}
                  className="text-xs text-neutral-700 hover:text-brand-violet-600 transition-colors text-left px-2 py-1 rounded hover:bg-neutral-100/60"
                >
                  geronimo@traveloz.com.uy - Admin
                </button>
                <button
                  type="button"
                  onClick={() => fillDemoUser("ventas@traveloz.com.uy")}
                  className="text-xs text-neutral-700 hover:text-brand-violet-600 transition-colors text-left px-2 py-1 rounded hover:bg-neutral-100/60"
                >
                  ventas@traveloz.com.uy - Vendedor
                </button>
                <button
                  type="button"
                  onClick={() => fillDemoUser("marketing@traveloz.com.uy")}
                  className="text-xs text-neutral-700 hover:text-brand-violet-600 transition-colors text-left px-2 py-1 rounded hover:bg-neutral-100/60"
                >
                  marketing@traveloz.com.uy - Marketing
                </button>
              </div>
              <p className="text-[10px] text-white/40 text-center mt-2">
                Password para todos: admin
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}
