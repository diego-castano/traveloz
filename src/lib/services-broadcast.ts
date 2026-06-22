// ---------------------------------------------------------------------------
// Sincronización del catálogo de servicios entre pestañas (sin tocar el server).
//
// El operador trabaja multipestaña: arma un paquete en una pestaña y abre otra
// para cargar hoteles (alojamientos), aéreos, etc. Sin avisar, la pestaña del
// paquete no se entera y el hotel recién creado no aparece en el selector. La
// única salida era recargar (F5), que descarta lo que se estaba armando.
//
// En vez de avisar "algo cambió, recargá todo" (que dispararía un refetch del
// catálogo completo por cada cambio y cada pestaña — costoso con un equipo
// grande), transmitimos la MUTACIÓN EXACTA: la misma acción del reducer que la
// pestaña que escribió ya aplicó localmente, con la entidad confirmada por el
// server. Las demás pestañas la aplican a su estado local. Cero requests extra:
// la pestaña que escribió ya pagó el costo del server; las otras solo espejan.
//
// Alcance: BroadcastChannel llega solo a las pestañas del MISMO navegador (la
// misma persona). No cruza a las máquinas del resto del equipo — eso lo cubre
// el refetch por foco que ya existe (acotado a 1 cada 15s por pestaña). Así que
// esto no multiplica la carga entre usuarios.
//
// El emisor no recibe su propio mensaje (BroadcastChannel no se auto-entrega),
// y el reducer aplica los ADD con upsert idempotente, así que aplicar un cambio
// remoto nunca duplica. Si el navegador no soporta BroadcastChannel, degradamos
// en silencio al refetch por foco.
// ---------------------------------------------------------------------------

const CHANNEL_NAME = "traveloz-services";

// Forma mínima y serializable de una acción del reducer de servicios. No
// importamos el tipo `ServiceAction` para evitar un ciclo de imports con el
// provider; el provider castea de vuelta al recibir.
export type ServiceMutation = { type: string; payload?: unknown };

let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
    return null;
  }
  if (!channel) channel = new BroadcastChannel(CHANNEL_NAME);
  return channel;
}

/** Transmite a las demás pestañas una mutación ya aplicada localmente. */
export function notifyServiceMutation(action: ServiceMutation): void {
  try {
    getChannel()?.postMessage(action);
  } catch {
    // BroadcastChannel no disponible (o payload no clonable): degradamos al
    // refetch por foco.
  }
}

/**
 * Suscribe un callback a las mutaciones provenientes de otras pestañas.
 * Devuelve una función de limpieza para el cleanup de un useEffect.
 */
export function subscribeServiceMutations(
  cb: (action: ServiceMutation) => void,
): () => void {
  const ch = getChannel();
  if (!ch) return () => {};
  const handler = (e: MessageEvent) => {
    const data = e.data as ServiceMutation | undefined;
    if (data && typeof data.type === "string") cb(data);
  };
  ch.addEventListener("message", handler);
  return () => ch.removeEventListener("message", handler);
}
