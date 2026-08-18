"use client";

/**
 * Pantalla de primer ingreso.
 *
 * La monta AdminShell - en lugar del panel - cuando la sesión trae
 * `mustChangePassword: true`, o sea cuando el usuario entró con la contraseña
 * temporal que le mandó un administrador. Dos salidas, las dos apagan el flag:
 *
 *   1. Elegir una contraseña nueva (recomendado).
 *   2. Seguir con la temporal, con confirmación.
 *
 * Después de cualquiera de las dos llamamos `update({ mustChangePassword:
 * false })` de useSession: eso dispara el callback jwt con trigger "update",
 * el token se re-emite sin el flag y esta pantalla deja de cumplir su
 * condición en AdminShell, así que desaparece sola sin recargar.
 *
 * El estilo sigue al de /backend/login (mesh animado + tarjeta liquid glass)
 * para que se lea como parte del mismo momento de entrada.
 */

import { useState, type FormEvent } from "react";
import { useSession } from "next-auth/react";
import { KeyRound, ShieldCheck } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useBrand } from "@/components/providers/BrandProvider";
import { useToast } from "@/components/ui/Toast";
import { glassMaterials } from "@/components/lib/glass";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  elegirNuevaPassword,
  seguirConTemporal,
} from "@/actions/primer-login.actions";

const NOISE_SVG =
  "data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E";

const ELEVATION_32 =
  "0 32px 64px -12px rgba(26,26,46,0.15), 0 12px 24px -8px rgba(26,26,46,0.08)";

export function PrimerLoginGate() {
  const { update } = useSession();
  const { user, logout } = useAuth();
  const { activeBrand } = useBrand();
  const { toast } = useToast();

  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [repetir, setRepetir] = useState("");
  const [errorActual, setErrorActual] = useState("");
  const [errorNueva, setErrorNueva] = useState("");
  const [errorRepetir, setErrorRepetir] = useState("");
  const [guardando, setGuardando] = useState(false);

  const [confirmandoTemporal, setConfirmandoTemporal] = useState(false);
  const [manteniendo, setManteniendo] = useState(false);

  const ocupado = guardando || manteniendo;
  const primerNombre = (user?.name || "").trim().split(/\s+/)[0] || "";

  // Cerrar el gate = refrescar el JWT. El server action ya escribió
  // mustChangePassword=false en la DB; esto sincroniza el token que el panel
  // lee en cada request.
  //
  // Si el refresco falla (o vuelve con el flag todavía prendido) caemos a
  // cerrar sesión: el próximo login emite un token nuevo leyendo el flag ya
  // apagado de la DB. Sin esa salida el usuario quedaría girando en esta
  // pantalla con el cambio hecho y el token viejo.
  const cerrarGate = async () => {
    try {
      const refreshed = await update({ mustChangePassword: false });
      if (refreshed?.user?.mustChangePassword === true) {
        throw new Error("el token volvió con el flag prendido");
      }
    } catch {
      toast(
        "info",
        "Volvé a iniciar sesión",
        "Tu elección quedó guardada. Entrá de nuevo para usar el panel.",
      );
      await logout();
    }
  };

  const handleNueva = async (e: FormEvent) => {
    e.preventDefault();
    setErrorActual("");
    setErrorNueva("");
    setErrorRepetir("");

    if (!actual) {
      setErrorActual("Escribí la contraseña temporal con la que entraste.");
      return;
    }
    if (nueva.length < 8) {
      setErrorNueva("Mínimo 8 caracteres.");
      return;
    }
    if (nueva !== repetir) {
      setErrorRepetir("Las dos contraseñas no coinciden.");
      return;
    }

    setGuardando(true);
    try {
      const res = await elegirNuevaPassword(actual, nueva);
      if (!res.ok) {
        setErrorActual(res.error);
        setGuardando(false);
        return;
      }
      toast("success", "Contraseña actualizada", "Ya podés usar el panel.");
      await cerrarGate();
    } catch {
      setErrorActual("No se pudo cambiar la contraseña. Probá de nuevo.");
      setGuardando(false);
    }
  };

  const handleTemporal = async () => {
    setManteniendo(true);
    try {
      const res = await seguirConTemporal();
      if (!res.ok) {
        toast("error", "No se pudo guardar tu elección", res.error);
        setManteniendo(false);
        return;
      }
      toast(
        "success",
        "Listo",
        "Seguís con la contraseña temporal. Podés cambiarla cuando quieras desde Mi perfil.",
      );
      await cerrarGate();
    } catch {
      toast("error", "No se pudo guardar tu elección", "Probá de nuevo.");
      setManteniendo(false);
    }
  };

  return (
    <div className="font-body relative flex min-h-screen items-center justify-center overflow-y-auto py-10">
      <div
        className="fixed inset-0 animate-mesh-float"
        style={{ background: activeBrand.loginBackground }}
      />
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          opacity: 0.025,
          mixBlendMode: "overlay",
          backgroundImage: `url("${NOISE_SVG}")`,
          backgroundRepeat: "repeat",
        }}
      />

      <div
        className="relative z-10 w-[480px] max-w-[calc(100vw-32px)]"
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

        <div className="flex items-center justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-violet-100/70">
            <ShieldCheck className="h-6 w-6 text-brand-violet-600" />
          </div>
        </div>

        <h1 className="mt-4 text-center font-display text-[26px] font-bold text-neutral-900">
          {primerNombre ? `Hola, ${primerNombre}` : "Hola"}
        </h1>
        <p className="mt-2 text-center text-sm leading-relaxed text-neutral-600">
          Entraste con una contraseña temporal. Elegí una propia para seguir, o
          quedate con la temporal si preferís cambiarla más adelante.
        </p>

        <form onSubmit={handleNueva} className="mt-7 flex flex-col gap-4">
          <Input
            label="Contraseña temporal"
            type="password"
            placeholder="••••••••"
            value={actual}
            onChange={(e) => {
              setActual(e.target.value);
              setErrorActual("");
            }}
            error={errorActual}
            autoComplete="current-password"
            autoFocus
            disabled={ocupado}
          />
          <Input
            label="Contraseña nueva"
            type="password"
            placeholder="Mínimo 8 caracteres"
            value={nueva}
            onChange={(e) => {
              setNueva(e.target.value);
              setErrorNueva("");
            }}
            error={errorNueva}
            autoComplete="new-password"
            disabled={ocupado}
          />
          <Input
            label="Repetir contraseña nueva"
            type="password"
            placeholder="••••••••"
            value={repetir}
            onChange={(e) => {
              setRepetir(e.target.value);
              setErrorRepetir("");
            }}
            error={errorRepetir}
            autoComplete="new-password"
            disabled={ocupado}
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="mt-2 w-full"
            loading={guardando}
            disabled={manteniendo}
          >
            <KeyRound className="h-4 w-4" />
            Guardar contraseña nueva
          </Button>
        </form>

        <div className="mt-6 border-t border-neutral-200/70 pt-5">
          {confirmandoTemporal ? (
            <div className="rounded-xl bg-amber-50/80 p-4">
              <p className="text-xs leading-relaxed text-amber-800">
                Vas a seguir usando la contraseña temporal que te pasaron. Si la
                vio otra persona, tu cuenta queda expuesta. Podés cambiarla
                cuando quieras desde <em>Mi perfil</em>.
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  onClick={() => setConfirmandoTemporal(false)}
                  disabled={manteniendo}
                >
                  Mejor la cambio
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="flex-1"
                  onClick={handleTemporal}
                  loading={manteniendo}
                >
                  Sí, seguir con la temporal
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmandoTemporal(true)}
              disabled={ocupado}
              className="w-full text-center text-xs font-medium text-neutral-500 transition-colors hover:text-brand-violet-600 disabled:opacity-50"
            >
              Seguir con la contraseña temporal
            </button>
          )}
        </div>

        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={() => logout()}
            disabled={ocupado}
            className="text-[11px] text-neutral-400 transition-colors hover:text-neutral-600 disabled:opacity-50"
          >
            ¿No sos {primerNombre || "vos"}? Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
