"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import Image from "next/image";
import { useBrand } from "@/components/providers/BrandProvider";
import { glassMaterials } from "@/components/lib/glass";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { resetPasswordWithToken } from "@/actions/auth.actions";

const NOISE_SVG =
  "data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E";

const ELEVATION_32 =
  "0 32px 64px -12px rgba(26,26,46,0.15), 0 12px 24px -8px rgba(26,26,46,0.08)";

const cardEntrance = {
  initial: { opacity: 0, y: 40, scale: 0.9, filter: "blur(10px)" },
  animate: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" },
  transition: { type: "spring" as const, stiffness: 200, damping: 22, delay: 0.2 },
};

function ResetPasswordInner() {
  const router = useRouter();
  const search = useSearchParams();
  const { activeBrand } = useBrand();

  const token = search?.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setLoading(true);
    try {
      await resetPasswordWithToken(token, password);
      router.push("/backend/login?reset=success");
    } catch (err: any) {
      setError(err?.message ?? "No se pudo restablecer la contraseña.");
      setLoading(false);
    }
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
          className="relative w-[420px]"
          style={{
            ...glassMaterials.liquid,
            padding: 40,
            borderRadius: 24,
            boxShadow: ELEVATION_32,
          }}
        >
          <h1 className="mt-2 text-center font-display text-[24px] font-bold text-neutral-900">
            Nueva contraseña
          </h1>

          {!token ? (
            <>
              <p className="mt-3 text-center text-sm text-red-600">
                El link no es válido. Pedí uno nuevo desde "Olvidé mi contraseña".
              </p>
              <Link
                href="/backend/forgot-password"
                className="mt-6 block w-full text-center text-sm font-medium text-brand-violet-600 hover:text-brand-violet-700"
              >
                Solicitar link nuevo
              </Link>
            </>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
              <Input
                label="Nueva contraseña"
                type="password"
                placeholder="Mínimo 8 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
              <Input
                label="Confirmar"
                type="password"
                placeholder="Repetí la contraseña"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                required
              />
              {error && (
                <p className="text-sm text-brand-red-500 text-center">{error}</p>
              )}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full mt-2"
                loading={loading}
                disabled={password.length < 8 || password !== confirm}
              >
                Guardar contraseña
              </Button>
              <Link
                href="/backend/login"
                className="text-center text-sm text-neutral-500 hover:text-brand-violet-600"
              >
                Volver al login
              </Link>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordInner />
    </Suspense>
  );
}
