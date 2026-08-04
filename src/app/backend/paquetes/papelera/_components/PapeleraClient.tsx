"use client";

// ---------------------------------------------------------------------------
// Papelera de paquetes - tabla de eliminados + quick view previo a recuperar.
//
// Es un componente presentacional puro: recibe las filas ya resueltas desde el
// server component de /backend/paquetes/papelera y sólo maneja búsqueda,
// selección de la fila para el quick view y la llamada a `restorePaquete`.
//
// No hay borrado definitivo a propósito: es irreversible y nadie lo pidió.
// ---------------------------------------------------------------------------

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarRange,
  Check,
  CheckCircle2,
  Eye,
  MapPin,
  Moon,
  Package,
  RotateCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/data/EmptyState";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/data/DataTable";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalClose,
} from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { proxyThumbUrl } from "@/components/lib/image-loader";
import { formatCurrency } from "@/lib/utils";
import { matchesId, matchesSearch } from "@/lib/search";
import { restorePaquete } from "@/actions/package.actions";
import type { PaqueteEliminado } from "@/actions/package.actions";

// Mismo mapeo de badges que el listado principal, para que el operador
// reconozca de una el estado que tenía el paquete antes de borrarse.
const estadoBadge = {
  BORRADOR: { variant: "draft" as const, label: "Borrador" },
  EN_REVISION: { variant: "review" as const, label: "En revisión" },
  ACTIVO: { variant: "active" as const, label: "Activo" },
  ARCHIVADO: { variant: "archived" as const, label: "Archivado" },
} as const;

const fechaLarga = new Intl.DateTimeFormat("es-UY", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const fechaCorta = new Intl.DateTimeFormat("es-UY", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

/** "hace 3 días" / "hace 2 meses" - contexto rápido al lado de la fecha. */
function haceCuanto(iso: string): string {
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (dias <= 0) return "hoy";
  if (dias === 1) return "ayer";
  if (dias < 30) return `hace ${dias} días`;
  const meses = Math.round(dias / 30);
  if (meses < 12) return `hace ${meses} ${meses === 1 ? "mes" : "meses"}`;
  const anios = Math.round(dias / 365);
  return `hace ${anios} ${anios === 1 ? "año" : "años"}`;
}

/** "12/03/2026 → 22/03/2026" a partir de las fechas ISO cortas del paquete. */
function formatPeriodo(desde: string | null, hasta: string | null): string {
  if (!desde && !hasta) return "Sin período de viaje cargado";
  const fmt = (s: string | null) =>
    s ? fechaCorta.format(new Date(`${s}T12:00:00`)) : "?";
  return `${fmt(desde)} → ${fmt(hasta)}`;
}

interface PapeleraClientProps {
  paquetes: PaqueteEliminado[];
  /** Mensaje de error de la carga (por ejemplo, rol sin permisos de edición). */
  error?: string | null;
}

export function PapeleraClient({ paquetes, error }: PapeleraClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [target, setTarget] = useState<PaqueteEliminado | null>(null);
  // Cuando la recuperación sale bien dejamos el modal abierto mostrando el
  // resultado: la ficha del paquete NO es accesible mientras está borrado
  // (el detalle lee del PackageProvider, que filtra `deletedAt`), así que el
  // link para "verlo completo" recién tiene sentido acá, ya recuperado.
  const [recuperado, setRecuperado] = useState<{
    id: string;
    titulo: string;
    estado: string;
    degradado: string[] | null;
  } | null>(null);
  const [pending, startTransition] = useTransition();

  const filtrados = useMemo(() => {
    const q = search.trim();
    if (!q) return paquetes;
    return paquetes.filter(
      (p) =>
        matchesId(q, p.id) ||
        matchesSearch(q, p.titulo, p.destino, p.destinos.join(" ")),
    );
  }, [paquetes, search]);

  function abrirQuickView(paquete: PaqueteEliminado) {
    setRecuperado(null);
    setTarget(paquete);
  }

  function cerrarModal() {
    setTarget(null);
    setRecuperado(null);
  }

  function handleRestore(paquete: PaqueteEliminado) {
    startTransition(async () => {
      try {
        const res = await restorePaquete(paquete.id);
        setRecuperado({
          id: res.id,
          titulo: res.titulo,
          estado: res.estado,
          degradado: res.degradado,
        });
        if (res.degradado) {
          toast(
            "warning",
            `"${res.titulo}" volvió como borrador`,
            `Estaba publicado, pero ya no cumple los requisitos para salir al sitio: ${res.degradado.join(", ")}. Completalo y publicalo de nuevo desde la ficha.`,
          );
        } else {
          toast(
            "success",
            `"${res.titulo}" recuperado`,
            "Volvió al catálogo tal como estaba. Abrilo desde el botón del modal.",
          );
        }
        // Refresca el server component para que la fila desaparezca de la tabla.
        router.refresh();
      } catch (err) {
        toast(
          "error",
          "No se pudo recuperar el paquete",
          err instanceof Error ? err.message : "Error desconocido",
        );
      }
    });
  }

  if (error) {
    return (
      <>
        <PageHeader title="Papelera" subtitle="Paquetes eliminados" />
        <EmptyState
          icon={Trash2}
          title="No podés ver la papelera"
          description={error}
          action={
            <Link href="/backend/paquetes">
              <Button variant="secondary" leftIcon={<ArrowLeft className="h-4 w-4" />}>
                Volver a Paquetes
              </Button>
            </Link>
          }
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Papelera"
        subtitle={
          paquetes.length === 0
            ? "Sin paquetes eliminados"
            : `${paquetes.length} paquete${paquetes.length === 1 ? "" : "s"} eliminado${paquetes.length === 1 ? "" : "s"}. Recuperalos y vuelven al catálogo tal como estaban.`
        }
        action={
          <Link href="/backend/paquetes">
            <Button variant="secondary" leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Volver a Paquetes
            </Button>
          </Link>
        }
      />

      {paquetes.length === 0 ? (
        <EmptyState
          icon={Trash2}
          title="La papelera está vacía"
          description="Cuando elimines un paquete desde el listado va a quedar acá, y vas a poder recuperarlo cuando quieras."
          action={
            <Link href="/backend/paquetes">
              <Button variant="secondary" leftIcon={<ArrowLeft className="h-4 w-4" />}>
                Volver a Paquetes
              </Button>
            </Link>
          }
        />
      ) : (
        <>
          {/* ===================== Buscador ===================== */}
          <div className="mb-5 flex flex-wrap items-center gap-2.5">
            <div className="relative flex h-8 min-w-[200px] flex-1 items-center rounded-[8px] border border-hairline bg-white focus-within:border-[#8B5CF6]/40 focus-within:ring-2 focus-within:ring-[#8B5CF6]/15 lg:max-w-[320px]">
              <Search size={13} className="absolute left-2.5 text-neutral-400" strokeWidth={2} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por título, destino o ID..."
                className="h-full w-full bg-transparent pl-8 pr-8 text-[12.5px] text-neutral-800 placeholder:text-neutral-400 focus:outline-none"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-1.5 flex h-4 w-4 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                  aria-label="Limpiar búsqueda"
                >
                  <X size={10} strokeWidth={2.5} />
                </button>
              )}
            </div>
            {search && (
              <span className="text-[12px] text-neutral-400">
                {filtrados.length} de {paquetes.length}
              </span>
            )}
          </div>

          {/* ===================== Tabla ===================== */}
          {filtrados.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No se encontraron paquetes eliminados"
              description="Probá con otro título, destino o ID."
              action={
                <Button variant="secondary" onClick={() => setSearch("")}>
                  Limpiar búsqueda
                </Button>
              }
            />
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.25 }}
              className="relative"
            >
              <Table className="!overflow-x-auto !overflow-y-visible [&>table]:min-w-[900px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[96px] whitespace-nowrap text-center">ID</TableHead>
                    <TableHead>Paquete</TableHead>
                    <TableHead className="text-center">Destino</TableHead>
                    <TableHead>Estado que tenía</TableHead>
                    <TableHead className="text-center">Precio desde</TableHead>
                    <TableHead className="whitespace-nowrap">Eliminado</TableHead>
                    <TableHead className="w-[1%] whitespace-nowrap">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtrados.map((paquete) => (
                    <TableRow
                      key={paquete.id}
                      className="cursor-pointer"
                      onClick={() => abrirQuickView(paquete)}
                    >
                      <TableCell variant="id" className="whitespace-nowrap">
                        {paquete.id}
                      </TableCell>
                      <TableCell className="max-w-[280px]">
                        <div className="flex flex-col">
                          <span className="truncate font-medium text-neutral-900">
                            {paquete.titulo}
                          </span>
                          {paquete.noches > 0 && (
                            <span className="mt-0.5 text-[11px] text-neutral-400">
                              {paquete.noches} noche{paquete.noches === 1 ? "" : "s"}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-[12.5px] text-neutral-600">
                        {paquete.destinos.length > 0
                          ? paquete.destinos.join(" · ")
                          : paquete.destino || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={estadoBadge[paquete.estado].variant}>
                          {estadoBadge[paquete.estado].label}
                        </Badge>
                        {paquete.publicado && (
                          <span className="ml-1.5 text-[10.5px] font-medium uppercase tracking-wider text-[#1F7D70]">
                            Publicado
                          </span>
                        )}
                      </TableCell>
                      <TableCell variant="price" className="text-center">
                        <span className="font-mono text-[13px] font-semibold tabular-nums text-neutral-900">
                          {paquete.precioDesde > 0 ? formatCurrency(paquete.precioDesde) : "-"}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-[12.5px] text-neutral-700">
                            {fechaLarga.format(new Date(paquete.deletedAt))}
                          </span>
                          <span className="text-[11px] text-neutral-400">
                            {haceCuanto(paquete.deletedAt)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="secondary"
                            size="xs"
                            leftIcon={<Eye className="h-3.5 w-3.5" />}
                            onClick={() => abrirQuickView(paquete)}
                          >
                            Ver
                          </Button>
                          <Button
                            size="xs"
                            leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
                            onClick={() => abrirQuickView(paquete)}
                          >
                            Recuperar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white/80 to-transparent md:hidden" />
            </motion.div>
          )}
        </>
      )}

      {/* ===================== Quick view ===================== */}
      <Modal
        open={!!target}
        onOpenChange={(open) => {
          if (!open) cerrarModal();
        }}
        size="lg"
      >
        {target && (
          <>
            <ModalHeader
              title={recuperado ? "Paquete recuperado" : target.titulo}
              description={
                recuperado
                  ? undefined
                  : `ID ${target.id} · eliminado ${haceCuanto(target.deletedAt)} (${fechaLarga.format(new Date(target.deletedAt))})`
              }
              icon={
                recuperado ? (
                  <CheckCircle2 size={19} strokeWidth={2.25} />
                ) : (
                  <Trash2 size={19} strokeWidth={2.25} />
                )
              }
              onClose={cerrarModal}
            >
              {null}
            </ModalHeader>

            <ModalBody>
              {recuperado ? (
                <div className="flex flex-col gap-3">
                  <p className="flex flex-wrap items-center gap-1.5 text-[14px] text-neutral-700">
                    <span className="font-semibold">{recuperado.titulo}</span>
                    <span>volvió al catálogo con estado</span>
                    <Badge
                      variant={
                        estadoBadge[recuperado.estado as keyof typeof estadoBadge]?.variant ??
                        "draft"
                      }
                    >
                      {estadoBadge[recuperado.estado as keyof typeof estadoBadge]?.label ??
                        recuperado.estado}
                    </Badge>
                  </p>
                  {recuperado.degradado && (
                    <div className="rounded-[12px] border border-[#E8913A]/25 bg-[#E8913A]/8 px-3.5 py-3 text-[12.5px] leading-relaxed text-[#8A5410]">
                      <p className="font-semibold">
                        Estaba publicado, pero lo bajamos a borrador.
                      </p>
                      <p className="mt-1">
                        Mientras estuvo en la papelera dejó de cumplir los requisitos para
                        salir al sitio, así que publicarlo de nuevo lo hubiera dejado
                        incompleto en la web. Le falta:
                      </p>
                      <ul className="mt-1.5 list-disc pl-4">
                        {recuperado.degradado.map((m) => (
                          <li key={m}>{m}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {/* Foto principal + datos rápidos, lado a lado en desktop para
                      que el operador vea todo sin scrollear el modal. */}
                  <div className="flex flex-col gap-4 sm:flex-row">
                    <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-[14px] bg-gradient-to-br from-neutral-100 to-neutral-50 sm:w-[44%]">
                      {/* key por paquete: resetea el flag de "imagen rota" al
                          abrir el quick view de otra fila. */}
                      <QuickViewFoto
                        key={target.id}
                        url={target.foto}
                        titulo={target.titulo}
                      />
                      <div className="absolute right-2.5 top-2.5 flex items-center gap-1.5">
                        <Badge variant={estadoBadge[target.estado].variant} size="sm">
                          {estadoBadge[target.estado].label}
                        </Badge>
                        {target.publicado && (
                          <Badge variant="active" size="sm">
                            Publicado
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                      <QuickField
                        icon={<MapPin size={13} strokeWidth={2} />}
                        label="Destino"
                        value={
                          target.destinos.length > 0
                            ? target.destinos.join(" · ")
                            : target.destino || "-"
                        }
                      />
                      <QuickField
                        icon={<Moon size={13} strokeWidth={2} />}
                        label="Noches"
                        value={target.noches > 0 ? String(target.noches) : "-"}
                      />
                      <QuickField
                        icon={<CalendarRange size={13} strokeWidth={2} />}
                        label="Fechas del viaje"
                        value={formatPeriodo(target.viajeDesde, target.viajeHasta)}
                      />
                      <QuickField
                        label="Precio desde"
                        value={
                          target.precioDesde > 0 ? formatCurrency(target.precioDesde) : "-"
                        }
                      />
                    </div>
                  </div>

                  {/* Incluye */}
                  {target.incluye.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                        Incluye
                      </p>
                      <ul className="max-h-[150px] space-y-1 overflow-y-auto text-[13px] leading-relaxed text-neutral-700">
                        {target.incluye.map((linea, i) => (
                          <li key={`${i}-${linea}`} className="flex items-start gap-2">
                            <Check
                              size={13}
                              strokeWidth={2.5}
                              className="mt-[3px] shrink-0 text-[#3BBFAD]"
                            />
                            <span>{linea}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <p className="text-[12px] leading-relaxed text-neutral-400">
                    Al recuperarlo vuelve al catálogo exactamente como estaba, con su
                    estado y su publicación. La ficha completa recién queda accesible
                    después de recuperarlo.
                  </p>
                </div>
              )}
            </ModalBody>

            <ModalFooter>
              {recuperado ? (
                <>
                  <ModalClose asChild>
                    <Button variant="ghost" onClick={cerrarModal}>
                      Cerrar
                    </Button>
                  </ModalClose>
                  <Link href={`/backend/paquetes/${recuperado.id}`}>
                    <Button rightIcon={<ArrowRight className="h-4 w-4" />}>
                      Abrir paquete
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <ModalClose asChild>
                    <Button variant="ghost" onClick={cerrarModal}>
                      Cancelar
                    </Button>
                  </ModalClose>
                  <Button
                    leftIcon={<RotateCcw className="h-4 w-4" />}
                    loading={pending}
                    onClick={() => handleRestore(target)}
                  >
                    Recuperar paquete
                  </Button>
                </>
              )}
            </ModalFooter>
          </>
        )}
      </Modal>
    </>
  );
}

/**
 * Foto del quick view. Cae al placeholder también cuando la imagen falla al
 * cargar: un paquete que estuvo en la papelera puede haber perdido el archivo
 * del bucket, y ahí el <img> roto con el alt suelto queda peor que el ícono.
 */
function QuickViewFoto({ url, titulo }: { url: string | null; titulo: string }) {
  const [roto, setRoto] = useState(false);
  if (!url || roto) {
    return (
      <div className="flex h-full w-full items-center justify-center text-neutral-300">
        <Package size={36} strokeWidth={1.25} />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={proxyThumbUrl(url, 720)}
      alt={titulo}
      className="h-full w-full object-cover"
      onError={() => setRoto(true)}
    />
  );
}

function QuickField({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[12px] border border-hairline bg-white/70 px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
        {icon}
        {label}
      </p>
      <p className="mt-0.5 text-[13.5px] text-neutral-800">{value}</p>
    </div>
  );
}
