"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, CreditCard, LogOut, Receipt, User, UserCog, Users } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { resumenSemaforo } from "@/actions/presupuesto.actions";
import { esRutaCotizador } from "../cotizador/tipos";
import { Avatar } from "@/components/ui/Avatar";
import { interactions } from "@/components/lib/animations";
import {
  LinkModal,
  type TipoDato,
} from "@/app/backend/dashboard/_components/datos/LinkModal";

/**
 * Vendor-only shell — no sidebar, no breadcrumb, no command palette.
 * Mirrors the mockup at /mockups/vendedor.html: full-width container with a
 * sticky frosted topbar that carries only the logo, the "VENDEDORES" label
 * and the user pill (with a dropdown for switch-user / logout).
 *
 * The vendor never navigates to other modules, so collapsing the chrome
 * keeps the focus on the package table where the actual work happens.
 */
export function VendedorShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, visibleModules } = useAuth();

  // El cotizador se dibuja a pantalla completa: sin el contenedor de 1200px ni
  // el padding que usa la tabla de paquetes.
  const esCotizador = esRutaCotizador(pathname);

  // Badge del botón "Cotizador": cuántas cotizaciones piden algo hoy (vencidas
  // sin abrir + sin abrir hace más de 24 h hábiles). `null` mientras no llegó
  // el dato: el badge no aparece y después desaparece, que es peor que no
  // mostrarlo. En 0 tampoco se dibuja — un cero no es una novedad.
  const [paraHoy, setParaHoy] = useState<number | null>(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  // Modal de links de datos. `null` = cerrado; el tipo decide qué link muestra.
  const [linkModal, setLinkModal] = useState<TipoDato | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const initials =
    (user?.name ?? "")
      .split(" ")
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "V";

  // Los links de datos pertenecen al dueño del slug. MARKETING hoy no monta
  // este shell, pero el gate va igual: del otro lado hay datos personales de
  // pasajeros y tarjetas.
  const puedeDatos = user?.role === "VENDEDOR" || user?.role === "ADMIN";

  function updateMenuPos() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMenuPos({ top: rect.bottom + 8, right: Math.max(12, window.innerWidth - rect.right) });
  }

  useEffect(() => {
    if (!menuOpen) return;
    updateMenuPos();
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", updateMenuPos);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", updateMenuPos);
    };
  }, [menuOpen]);

  // El cotizador es el único módulo con cola de trabajo, así que el badge se
  // pide solo si el rol lo tiene habilitado. Cada 5 minutos alcanza: lo que
  // cambia son recordatorios, no un chat.
  const hayCotizador = visibleModules.includes("cotizador");
  useEffect(() => {
    if (!hayCotizador) return;
    let vivo = true;
    const traer = async () => {
      try {
        const res = await resumenSemaforo();
        if (vivo && res.ok) setParaHoy(res.data.paraHoy);
      } catch {
        // Un badge no puede romper el shell: si falla, se queda como estaba.
      }
    };
    void traer();
    const id = setInterval(() => void traer(), 5 * 60 * 1000);
    return () => {
      vivo = false;
      clearInterval(id);
    };
  }, [hayCotizador]);

  async function handleLogout() {
    setMenuOpen(false);
    await logout();
    router.push("/backend/login");
  }

  return (
    <div className="font-body flex min-h-screen flex-col bg-[#F7F8FA]">
      {/* ─── Topbar ─────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-30 border-b border-[#E8EAEE] print:hidden"
        style={{
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(12px) saturate(140%)",
          WebkitBackdropFilter: "blur(12px) saturate(140%)",
        }}
      >
        <div className="mx-auto flex max-w-[1200px] items-center gap-4 px-6 py-3.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/header-logo.webp" alt="TravelOz" className="h-8 w-auto" />
          <p className="m-0 text-[13px] font-medium tracking-wide text-neutral-500">
            VENDEDORES
          </p>

          {/* Accesos a los links de datos + pill de usuario. Van juntos en un
              contenedor con ml-auto para que el pill no dependa del suyo (los
              botones pueden no montarse según el rol). */}
          <div className="ml-auto flex items-center gap-2">
            {puedeDatos && (
              <>
                <TopbarLinkAnchor
                  label="Cotizador"
                  href="/backend/cotizador"
                  activo={esCotizador}
                  icon={<Receipt size={14} strokeWidth={2.2} />}
                  badge={paraHoy ?? 0}
                />
                <TopbarLinkButton
                  label="Datos de pasajeros"
                  onClick={() => setLinkModal("PASAJEROS")}
                  icon={<Users size={14} strokeWidth={2.2} />}
                />
                {/* Violeta lleno, no rojo: la tarjeta es el trámite más
                    delicado del panel y el color tiene que transmitir
                    seguridad, no alarma (pedido del cliente, 26/08/2026). */}
                <TopbarLinkButton
                  label="Datos de tarjeta"
                  onClick={() => setLinkModal("PAGO")}
                  icon={<CreditCard size={14} strokeWidth={2.2} />}
                  tono="violeta"
                />
              </>
            )}

            <button
              ref={triggerRef}
              type="button"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => {
                if (menuOpen) {
                  setMenuOpen(false);
                  return;
                }
                updateMenuPos();
                setMenuOpen(true);
              }}
              className="flex items-center gap-2 rounded-full bg-[#F5F3FF] px-3 py-1.5 text-[12px] font-semibold text-[#8B5CF6] transition hover:bg-[#EDE9FE]"
            >
              <span className="grid h-[22px] w-[22px] place-items-center rounded-full bg-[#8B5CF6] text-[10px] font-bold text-white">
                {initials}
              </span>
              <span className="hidden sm:inline">{user?.name ?? "Vendedor"}</span>
              <ChevronDown
                size={12}
                className={`text-[#8B5CF6]/70 transition-transform ${menuOpen ? "rotate-180" : ""}`}
              />
            </button>
          </div>
        </div>
      </header>

      {/* Un solo modal para los dos botones: el tipo lo decide el estado. */}
      {puedeDatos && (
        <LinkModal
          tipo={linkModal ?? "PASAJEROS"}
          open={linkModal !== null}
          onOpenChange={(o) => {
            if (!o) setLinkModal(null);
          }}
        />
      )}

      {/* ─── Main container ─────────────────────────────────── */}
      <main className="flex-1 print:static">
        {esCotizador ? (
          children
        ) : (
          <div className="mx-auto w-full max-w-[1200px] px-6 py-8 pb-32">{children}</div>
        )}
      </main>

      {/* ─── User menu portal ───────────────────────────────── */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {menuOpen && menuPos && (
              <motion.div
                ref={menuRef}
                role="menu"
                {...interactions.dropdownOpen}
                className="fixed min-w-[220px] overflow-hidden rounded-[12px] border border-[#E8EAEE] bg-white p-1.5 shadow-[0_18px_48px_-18px_rgba(17,17,36,0.35)]"
                style={{ top: menuPos.top, right: menuPos.right, zIndex: 10000 }}
              >
                <div className="border-b border-[#E8EAEE] bg-neutral-50/70 px-3 py-2.5">
                  <p className="text-sm font-medium text-neutral-700">{user?.name}</p>
                  <p className="text-xs text-neutral-400">{user?.email}</p>
                </div>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    router.push("/backend/mi-perfil");
                  }}
                  className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-neutral-700 outline-none transition-colors hover:bg-neutral-100"
                >
                  <UserCog size={14} />
                  Mi perfil
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => void handleLogout()}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-neutral-700 outline-none transition-colors hover:bg-neutral-100"
                >
                  <User size={14} />
                  Cambiar de usuario
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => void handleLogout()}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 outline-none transition-colors hover:bg-red-50"
                >
                  <LogOut size={14} />
                  Cerrar sesión
                </button>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}

/**
 * Botón violeta del topbar. En desktop muestra el texto; abajo de `sm` se
 * queda solo con el ícono (el topbar del celu no da para dos etiquetas) y el
 * nombre viaja en el aria-label.
 */
/**
 * La misma píldora, pero como link de navegación. Activa (fondo lleno) cuando
 * ya estás en esa ruta.
 */
function TopbarLinkAnchor({
  label,
  icon,
  href,
  activo,
  badge = 0,
}: {
  label: string;
  icon: ReactNode;
  href: string;
  activo: boolean;
  /** Cuántas cosas esperan del otro lado. En 0 no se dibuja nada. */
  badge?: number;
}) {
  return (
    <Link
      href={href}
      aria-label={badge > 0 ? `${label} · ${badge} para hoy` : label}
      aria-current={activo ? "page" : undefined}
      className={
        activo
          ? "flex items-center gap-1.5 rounded-full border border-[#8B5CF6]/40 bg-[#EDE9FE] px-2.5 py-1.5 text-[12px] font-semibold text-[#6C2BD9] transition sm:px-3"
          : "flex items-center gap-1.5 rounded-full border border-[#8B5CF6]/15 bg-[#F5F3FF]/70 px-2.5 py-1.5 text-[12px] font-semibold text-[#8B5CF6] transition hover:border-[#8B5CF6]/35 hover:bg-[#EDE9FE] sm:px-3"
      }
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
      {badge > 0 && (
        <span
          title={`${badge} ${badge === 1 ? "cotización pide" : "cotizaciones piden"} algo hoy`}
          className="grid h-[17px] min-w-[17px] place-items-center rounded-full bg-[#F43E55] px-1 text-[10px] font-bold leading-none text-white"
        >
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );
}

function TopbarLinkButton({
  label,
  icon,
  onClick,
  tono = "suave",
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  /** "violeta" = pill lleno del violeta de marca (brand-violet-600). */
  tono?: "suave" | "violeta";
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={label}
      whileTap={{ scale: 0.97 }}
      className={
        tono === "violeta"
          ? "flex items-center gap-1.5 rounded-full border border-brand-violet-600 bg-brand-violet-600 px-2.5 py-1.5 text-[12px] font-semibold text-white shadow-[0_4px_12px_-6px_rgba(108,43,217,0.8)] transition hover:bg-brand-violet-700 sm:px-3"
          : "flex items-center gap-1.5 rounded-full border border-[#8B5CF6]/15 bg-[#F5F3FF]/70 px-2.5 py-1.5 text-[12px] font-semibold text-[#8B5CF6] transition hover:border-[#8B5CF6]/35 hover:bg-[#EDE9FE] sm:px-3"
      }
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </motion.button>
  );
}
