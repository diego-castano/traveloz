// Envoltorio común de las actions de Collection (mismo contrato que
// medios.actions.ts): { ok, data } | { ok, error }. Sin "use server".

import { ErrorDeNegocio } from "@/lib/presupuesto/acceso";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "collection.actions" });

/** `conflicto: true` solo lo manda `guardarExperiencia` (otra persona guardó antes). */
export type Resultado<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; conflicto?: true };

const GENERICO = "No pudimos completar la operación. Probá de nuevo.";

/** Error de negocio que además avisa al cliente que hubo un choque de versiones. */
export class ConflictoDeVersion extends ErrorDeNegocio {}

export async function ejecutar<T>(nombre: string, fn: () => Promise<T>): Promise<Resultado<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    if (err instanceof ConflictoDeVersion) return { ok: false, error: err.message, conflicto: true };
    if (err instanceof ErrorDeNegocio) return { ok: false, error: err.message };
    const msg = err instanceof Error ? err.message : "";
    if (msg.startsWith("No autorizado") || msg.startsWith("Acceso restringido")) {
      return { ok: false, error: msg };
    }
    log.error(`${nombre}.fail`, { err });
    return { ok: false, error: GENERICO };
  }
}
