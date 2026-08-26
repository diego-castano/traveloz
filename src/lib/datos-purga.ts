// ---------------------------------------------------------------------------
// Purga de la bóveda de datos de pago.
//
// La promesa que le hacemos al pasajero (y que dice el email de solicitud) es
// que la tarjeta se borra sola a las HORAS_BOVEDA (hoy 96). Este módulo es
// quien cumple esa promesa: pone en null los tres campos cifrados
// (payload / iv / tag) y sella `purgadoAt`. La fila NO se borra - queda el
// rastro auditable (pasajero, titular, emisor, últimos 4, fechas) sin nada
// descifrable adentro.
//
// Se dispara por dos vías, y ninguna necesita cron externo obligatorio:
//   1. POST /api/datos/purgar - sesión ADMIN o header x-purga-secret. Es la
//      que engancha el scheduled job de Railway.
//   2. barridoOportunista() - ~5% de las revelaciones de bóveda, mismo patrón
//      probabilístico que el prune de PaginaVista en /api/visita.
// ---------------------------------------------------------------------------

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "datos-purga" });

/** Probabilidad de que una llamada a la bóveda arrastre un barrido. */
const PROBABILIDAD_BARRIDO = 0.05;

// ###########################################################################
// #                                                                         #
// #   ⛔ EL ÚNICO updateMany PERMITIDO SOBRE DatosPagoCifrado ES EL DE       #
// #      ABAJO, Y SIEMPRE CON ESTE MISMO WHERE:                             #
// #                                                                         #
// #          { expiraAt: { lt: new Date() }, purgadoAt: null }              #
// #                                                                         #
// #   Las dos condiciones son obligatorias y ninguna es decorativa:         #
// #                                                                         #
// #     • `expiraAt < ahora` es lo que separa un dato vivo de uno vencido.   #
// #       Sin esa cláusula, un updateMany borra la bóveda ENTERA -          #
// #       incluidas las tarjetas que un vendedor está por cobrar. No hay    #
// #       backup posible: el payload cifrado es la única copia y una vez    #
// #       en null no se recupera ni con la clave.                           #
// #                                                                         #
// #     • `purgadoAt: null` hace la operación idempotente y deja el sello   #
// #       de la purga real. Sin ella, cada barrido pisaría `purgadoAt` de   #
// #       filas ya limpias y perderíamos la fecha en que de verdad se       #
// #       borró el dato (que es justo lo que se le muestra al vendedor y    #
// #       lo que respondemos si alguien pregunta cuándo se eliminó).        #
// #                                                                         #
// #   La DB de este proyecto ES producción. Si alguna vez hace falta otra   #
// #   escritura masiva sobre esta tabla, escribila como una función nueva   #
// #   con su propio where explícito y su propio comentario - NO relajes     #
// #   este where ni le agregues parámetros para "reusarlo".                 #
// #                                                                         #
// ###########################################################################

/**
 * Borra el contenido cifrado de todos los registros vencidos que todavía no
 * fueron purgados. Devuelve cuántos limpió (0 es el caso normal).
 */
export async function purgarBovedaVencida(): Promise<number> {
  const ahora = new Date();
  const res = await prisma.datosPagoCifrado.updateMany({
    // ⛔ Este where no se toca. Ver el bloque de arriba.
    where: { expiraAt: { lt: ahora }, purgadoAt: null },
    data: {
      payload: null,
      iv: null,
      tag: null,
      // El documento del pasajero va en claro (fuera del sobre) y también es
      // dato personal: se borra con la tarjeta. El nombre queda, identifica la fila.
      pasajeroDocumento: null,
      purgadoAt: ahora,
    },
  });

  if (res.count > 0) {
    // Solo el conteo: acá no se loguea ni un id de registro, mucho menos algo
    // de la tarjeta.
    log.info("datos.pago.purga", { purgados: res.count });
  }
  return res.count;
}

/**
 * Barrido probabilístico (~5%). Se llama al abrir la bóveda para que la purga
 * no dependa exclusivamente del scheduled job: si el cron se cae o nadie lo
 * configuró, el propio uso del panel termina limpiando lo vencido.
 *
 * Nunca propaga: un fallo del barrido no puede tumbar la acción que lo
 * invocó. Devuelve cuántos purgó, o null si esta vez no le tocó correr.
 */
export async function barridoOportunista(): Promise<number | null> {
  if (Math.random() >= PROBABILIDAD_BARRIDO) return null;
  try {
    return await purgarBovedaVencida();
  } catch (err) {
    log.warn("datos.pago.purga.oportunista failed", err);
    return null;
  }
}
