"use client";

// Equipo de Collection (solo super admin): quién entra y qué puede hacer.
// Cada interruptor guarda al toque; si el servidor rechaza, vuelve atrás.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown } from "lucide-react";
import {
  guardarPermisosCollection,
  type MiembroCollection,
} from "@/actions/collection/equipo.actions";
import type { PermisoCollection } from "@/lib/collection/permisos";
import { cn } from "@/components/lib/cn";
import { iniciales, useCollection } from "../shell/contexto";
import { useAviso } from "../shell/Avisos";
import { Boton, EncabezadoPagina, Filtros, Interruptor } from "../ui";
import { TextoCambiante, transiciones } from "../movimiento";

const ROLES: Record<string, string> = { ADMIN: "Admin", VENDEDOR: "Vendedor", MARKETING: "Marketing" };

const tieneAcceso = (m: MiembroCollection) => m.superAdmin || m.permisos.length > 0;

function resumen(m: MiembroCollection) {
  if (m.superAdmin) return "Super admin";
  if (m.permisos.length === 0) return "Sin acceso";
  const extra = m.permisos.filter((p) => p !== "panel").length;
  return extra === 0 ? "Solo mira el panel" : `${extra} ${extra === 1 ? "permiso" : "permisos"}`;
}

export interface InfoPermiso {
  id: PermisoCollection;
  label: string;
  descripcion: string;
}

type Guardar = typeof guardarPermisosCollection;

export function Equipo({
  inicial,
  permisos,
  guardarPermisos = guardarPermisosCollection,
}: {
  inicial: MiembroCollection[];
  permisos: InfoPermiso[];
  /** La ruta de desarrollo pasa uno en memoria. */
  guardarPermisos?: Guardar;
}) {
  const [miembros, setMiembros] = useState(inicial);
  const [filtro, setFiltro] = useState<"acceso" | "todos">("acceso");
  const [abierto, setAbierto] = useState<string | null>(null);
  const [guardando, setGuardando] = useState<Set<string>>(new Set());
  const [errores, setErrores] = useState<Record<string, string>>({});
  // Super admin da (o saca) acceso total: se confirma en línea antes de guardar.
  const [confirmarSa, setConfirmarSa] = useState<string | null>(null);
  const avisar = useAviso();
  const router = useRouter();
  const { usuario } = useCollection();

  const visibles = filtro === "todos" ? miembros : miembros.filter(tieneAcceso);
  const conAcceso = miembros.filter(tieneAcceso).length;

  const guardar = async (m: MiembroCollection, cambio: { superAdmin: boolean; permisos: PermisoCollection[] }) => {
    const previo = m;
    setMiembros((lista) => lista.map((x) => (x.id === m.id ? { ...x, ...cambio, conFila: true } : x)));
    setGuardando((s) => new Set(s).add(m.id));
    setErrores((e) => Object.fromEntries(Object.entries(e).filter(([k]) => k !== m.id)));
    const r = await guardarPermisos(m.id, cambio);
    setGuardando((s) => {
      const n = new Set(s);
      n.delete(m.id);
      return n;
    });
    if (!r.ok) {
      setMiembros((lista) => lista.map((x) => (x.id === m.id ? previo : x)));
      setErrores((e) => ({ ...e, [m.id]: r.error }));
      avisar(r.error, "error");
      return;
    }
    avisar(`Permisos de ${m.name.split(" ")[0]} guardados.`);
    // Si se tocó a sí mismo, el shell tiene que enterarse (menú, Equipo).
    if (m.id === usuario.id) router.refresh();
  };

  const alternarPermiso = (m: MiembroCollection, p: PermisoCollection, on: boolean) => {
    let permisos = on ? Array.from(new Set([...m.permisos, p])) : m.permisos.filter((x) => x !== p);
    // Sin "panel" no entra a nada: prender cualquier permiso lo suma y apagarlo apaga todo.
    if (on && p !== "panel") permisos = Array.from(new Set<PermisoCollection>(["panel", ...permisos]));
    if (!on && p === "panel") permisos = [];
    void guardar(m, { superAdmin: m.superAdmin, permisos });
  };

  return (
    <div className="mx-auto max-w-[1080px]">
      <EncabezadoPagina
        titulo={
          <>
            Quién trabaja en <em className="italic">Collection</em>
          </>
        }
        descripcion="Los permisos son propios de Collection y no cambian el rol en Traveloz. Cada cambio se guarda solo."
        acciones={
          <Filtros
            className="flex-none"
            etiqueta="Mostrar"
            opciones={[
              { id: "acceso" as const, label: "Con acceso", n: conAcceso },
              { id: "todos" as const, label: "Todos", n: miembros.length },
            ]}
            valor={filtro}
            onChange={setFiltro}
          />
        }
      />

      {visibles.length === 0 ? (
        <p className="py-20 text-center font-col-display text-col-2xl font-light italic text-col-ink">
          Nadie tiene acceso todavía.
        </p>
      ) : (
        <ul className="divide-y divide-col-line border-y border-col-line">
          {visibles.map((m) => {
            const expandido = abierto === m.id;
            const ocupado = guardando.has(m.id);
            return (
              <li key={m.id} className="bg-col-base">
                <div className="flex items-center gap-4 py-4 md:gap-5">
                  <Avatar m={m} />
                  <button
                    type="button"
                    onClick={() => setAbierto(expandido ? null : m.id)}
                    aria-expanded={expandido}
                    aria-controls={`permisos-${m.id}`}
                    className="flex min-w-0 flex-1 items-center gap-4 text-left"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-col-cuerpo text-col-ink">{m.name}</span>
                        <span className="hidden shrink-0 rounded-col-sm border border-col-line px-1.5 py-0.5 text-col-xs uppercase tracking-[0.14em] text-col-slate sm:inline">
                          {ROLES[m.role] ?? m.role}
                        </span>
                      </span>
                      <span className="block truncate text-col-sm text-col-slate">{m.email}</span>
                    </span>
                    <span
                      className={cn(
                        "hidden shrink-0 text-col-sm md:block",
                        m.superAdmin ? "text-col-ink" : tieneAcceso(m) ? "text-col-slate" : "text-col-muted",
                      )}
                    >
                      <TextoCambiante texto={ocupado ? "Guardando" : resumen(m)} />
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 text-col-slate transition-transform duration-col-abre ease-col",
                        expandido && "rotate-180",
                      )}
                      strokeWidth={1.5}
                      aria-hidden
                    />
                  </button>
                </div>
                <AnimatePresence initial={false}>
                  {expandido && (
                    <motion.div
                      id={`permisos-${m.id}`}
                      {...transiciones.acordeon}
                      className="overflow-hidden"
                    >
                      <div className="pb-6 pl-0 md:pl-[60px]">
                        <div className="flex items-start gap-4 rounded-col-sm bg-col-surface px-5 py-4">
                          <div className="flex-1">
                            <label htmlFor={`sa-${m.id}`} className="block text-col-cuerpo text-col-ink">
                              Super admin
                            </label>
                            <p className="mt-0.5 text-col-sm text-col-slate">
                              Puede todo y además gestiona el equipo.
                            </p>
                          </div>
                          <Interruptor
                            id={`sa-${m.id}`}
                            label={`Super admin para ${m.name}`}
                            checked={m.superAdmin}
                            disabled={ocupado || confirmarSa === m.id}
                            onCheckedChange={() => setConfirmarSa(m.id)}
                          />
                        </div>
                        <AnimatePresence initial={false}>
                          {confirmarSa === m.id && (
                            <motion.div
                              {...transiciones.acordeon}
                              className="overflow-hidden"
                            >
                              <div
                                role="alertdialog"
                                aria-label="Confirmar super admin"
                                className="mt-2 flex flex-wrap items-center gap-3 rounded-col bg-col-surface px-5 py-4 ring-1 ring-inset ring-col-aviso/30"
                              >
                                <p className="mr-auto min-w-[220px] flex-1 text-col-md text-col-ink">
                                  {m.superAdmin
                                    ? `¿Quitarle el acceso total a ${m.name.split(" ")[0]}? Se queda con los permisos de abajo.`
                                    : `¿Darle acceso total a ${m.name.split(" ")[0]}? Va a poder cambiar todo, también el equipo.`}
                                </p>
                                <Boton variante="fantasma" tam="sm" onClick={() => setConfirmarSa(null)}>
                                  Cancelar
                                </Boton>
                                <Boton
                                  variante={m.superAdmin ? "peligro" : "primario"}
                                  tam="sm"
                                  autoFocus
                                  onClick={() => {
                                    setConfirmarSa(null);
                                    void guardar(m, { superAdmin: !m.superAdmin, permisos: m.permisos });
                                  }}
                                >
                                  {m.superAdmin ? "Sí, quitar" : "Sí, dar acceso total"}
                                </Boton>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                        <div className="mt-2 grid gap-x-8 md:grid-cols-2">
                          {permisos.map(({ id: p, label, descripcion }) => {
                            const incluido = m.superAdmin;
                            return (
                              <div key={p} className="flex items-start gap-4 border-b border-col-line px-5 py-4 last:border-b-0 md:[&:nth-last-child(2)]:border-b-0">
                                <div className="flex-1">
                                  <label htmlFor={`${p}-${m.id}`} className={cn("block text-col-cuerpo", incluido ? "text-col-slate" : "text-col-ink")}>
                                    {label}
                                  </label>
                                  <p className="mt-0.5 text-col-sm leading-relaxed text-col-slate">
                                    {incluido ? "Incluido por super admin." : descripcion}
                                  </p>
                                </div>
                                <Interruptor
                                  id={`${p}-${m.id}`}
                                  label={`${label} para ${m.name}`}
                                  checked={incluido || m.permisos.includes(p)}
                                  disabled={incluido || ocupado}
                                  onCheckedChange={(v) => alternarPermiso(m, p, v)}
                                />
                              </div>
                            );
                          })}
                        </div>
                        {errores[m.id] && (
                          <p role="alert" className="mt-3 px-5 text-col-sm text-col-alerta">
                            {errores[m.id]}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Avatar({ m }: { m: MiembroCollection }) {
  return (
    <span
      className={cn(
        "relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-col-sm font-col-display text-col-lg",
        tieneAcceso(m) ? "bg-col-ink text-col-base" : "bg-col-line text-col-slate",
      )}
    >
      {m.fotoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={m.fotoUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        iniciales(m.name)
      )}
      {m.superAdmin && <span aria-hidden className="absolute inset-x-0 bottom-0 h-0.5 bg-col-gold" />}
    </span>
  );
}
