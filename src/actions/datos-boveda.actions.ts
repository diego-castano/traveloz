"use server";

// ---------------------------------------------------------------------------
// Bóveda de datos de pago - lectura con segundo factor.
//
//   getPagoMeta(id)              → cabecera del registro (sin nada sensible).
//   revelarPago({id, credencial}) → descifra UNA vez, contra PIN o contraseña.
//
// Reglas que no se negocian:
//   • El payload descifrado NUNCA toca el logger, ni el audit log, ni un
//     mensaje de error. Lo único que sale de acá con datos de tarjeta es el
//     valor de retorno de revelarPago, que el cliente muestra y no cachea.
//   • La credencial que tipea el vendedor tampoco se loguea. Ni en el fallo,
//     ni truncada, ni hasheada: no entra al logger bajo ninguna forma.
//   • Alcance: el vendedor dueño del registro o un ADMIN. Decisión cerrada con
//     el cliente - el superadmin también abre la bóveda.
// ---------------------------------------------------------------------------

import { compareSync } from "bcryptjs";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/require-auth";
import { logAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { cancelScheduledEmail } from "@/lib/email";
import { descifrar } from "@/lib/datos-cifrado";
import { barridoOportunista } from "@/lib/datos-purga";

const log = logger.child({ module: "datos-boveda.actions" });

/** Un PIN es 4-6 dígitos, igual que en mi-perfil y en el login por PIN. */
const PIN_REGEX = /^\d{4,6}$/;

const MSG_CREDENCIAL = "Credencial incorrecta.";
const MSG_PURGADO = "El dato ya fue eliminado.";
const MSG_NO_ENCONTRADO = "No encontramos estos datos de pago.";
const MSG_GENERICO = "No se pudieron abrir los datos. Intentá de nuevo.";
const MSG_RATE =
  "Demasiados intentos fallidos. Esperá unos minutos antes de volver a probar.";

// ---------------------------------------------------------------------------
// Rate limit de intentos
//
// Sin esto la credencial es brute-forceable: la acción se puede llamar en loop
// desde DevTools y bcrypt sin techo es una invitación a probar los 10.000 PINs
// de 4 dígitos. Diez intentos por usuario cada 15 minutos dejan margen para un
// par de tipeos y cortan cualquier automatización.
//
// Es la misma estrategia (y la misma ventana) que `checkLoginRate` de
// @/lib/rate-limit: Map process-local, suficiente con una sola instancia en
// Railway; si algún día escalamos horizontal, esto y los limiters de allá se
// mudan juntos a Redis. Vive acá y no en rate-limit.ts por dos razones: la
// clave es un userId y no una IP (mezclarlos en el Map de login ensuciaría
// `resetLoginRate`, que borra por IP), y el techo es 10 y no 20.
// ---------------------------------------------------------------------------

const REVELAR_WINDOW_MS = 15 * 60 * 1000;
const REVELAR_MAX_FALLOS = 10;

const revelarBuckets = new Map<string, { count: number; resetAt: number }>();

/** Registra un intento fallido. Los éxitos no consumen cupo. */
function contarFallo(userId: string): void {
  const now = Date.now();
  const b = revelarBuckets.get(userId);
  if (!b || b.resetAt < now) {
    revelarBuckets.set(userId, { count: 1, resetAt: now + REVELAR_WINDOW_MS });
    return;
  }
  b.count += 1;
}

/** ¿Este usuario todavía tiene intentos? Consulta pura, no consume. */
function puedeIntentar(userId: string): boolean {
  const now = Date.now();
  // GC oportunista para que el Map no crezca sin límite.
  if (revelarBuckets.size > 1000) {
    revelarBuckets.forEach((b, k) => {
      if (b.resetAt < now) revelarBuckets.delete(k);
    });
  }
  const b = revelarBuckets.get(userId);
  if (!b || b.resetAt < now) return true;
  return b.count < REVELAR_MAX_FALLOS;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function requestMeta(): Promise<{ ip: string | null; userAgent: string | null }> {
  try {
    const h = await headers();
    const fwd = h.get("x-forwarded-for");
    const ip = fwd ? fwd.split(",")[0]!.trim() : h.get("x-real-ip");
    return { ip: ip || null, userAgent: h.get("user-agent") };
  } catch {
    return { ip: null, userAgent: null };
  }
}

const idSchema = z.string().min(1).max(60);

const revelarSchema = z.object({
  id: idSchema,
  // El largo mínimo cubre el PIN de 4 dígitos; el máximo es un tope sano para
  // no pasarle a bcrypt una cadena arbitrariamente larga.
  credencial: z.string().min(4, "Ingresá tu PIN o tu contraseña.").max(100),
});

// ---------------------------------------------------------------------------
// Metadata del registro (pantalla de confirmación)
// ---------------------------------------------------------------------------

export interface PagoMetaView {
  id: string;
  titular: string;
  emisor: string | null;
  ultimos4: string;
  createdAt: Date;
  expiraAt: Date;
  vistoAt: Date | null;
  purgadoAt: Date | null;
  /** Estado derivado, para que la UI no repita la lógica de fechas. */
  estado: "DISPONIBLE" | "VISTO" | "PURGADO" | "VENCIDO";
  vendedorEmail: string;
}

/**
 * Cabecera del registro para la pantalla de "estás por abrir estos datos".
 * Mismo alcance que revelarPago (dueño o ADMIN) y CERO campos cifrados: de
 * acá no sale ni el payload ni el iv ni el tag.
 */
export async function getPagoMeta(id: string): Promise<PagoMetaView | null> {
  try {
    const ctx = await requireAuth();
    const parsed = idSchema.safeParse(id);
    if (!parsed.success) return null;

    const row = await prisma.datosPagoCifrado.findUnique({
      where: { id: parsed.data },
      select: {
        id: true,
        vendedorId: true,
        vendedorEmail: true,
        titular: true,
        emisor: true,
        ultimos4: true,
        createdAt: true,
        expiraAt: true,
        vistoAt: true,
        purgadoAt: true,
      },
    });
    if (!row) return null;
    if (row.vendedorId !== ctx.userId && ctx.role !== "ADMIN") return null;

    const vencido = row.expiraAt.getTime() < Date.now();
    const estado: PagoMetaView["estado"] = row.purgadoAt
      ? "PURGADO"
      : vencido
        ? "VENCIDO"
        : row.vistoAt
          ? "VISTO"
          : "DISPONIBLE";

    return {
      id: row.id,
      titular: row.titular,
      emisor: row.emisor,
      ultimos4: row.ultimos4,
      createdAt: row.createdAt,
      expiraAt: row.expiraAt,
      vistoAt: row.vistoAt,
      purgadoAt: row.purgadoAt,
      estado,
      vendedorEmail: row.vendedorEmail,
    };
  } catch (err) {
    log.error("getPagoMeta failed", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Revelación
// ---------------------------------------------------------------------------

export interface DatosRevelados {
  numero: string;
  vencimiento: string;
  cvv: string;
  documentoTitular: string;
  cuotas: string | null;
  extras: { id: string; etiqueta: string; valor: string }[];
}

export type RevelarResult =
  | { ok: true; datos: DatosRevelados }
  | { ok: false; message: string };

/**
 * Descifra los datos de tarjeta de un registro de la bóveda, previa
 * verificación de un SEGUNDO factor (el PIN del usuario si tiene uno y lo que
 * tipeó parece un PIN; su contraseña en cualquier otro caso). Tener la sesión
 * abierta no alcanza: la idea es que una laptop desbloqueada y sin dueño no
 * abra la bóveda.
 *
 * Devuelve un resultado en vez de tirar: los errores que se tiran desde una
 * server action llegan enmascarados al cliente en producción, y acá el mensaje
 * ("credencial incorrecta") es justamente lo que el vendedor necesita leer.
 */
export async function revelarPago(input: {
  id: string;
  credencial: string;
}): Promise<RevelarResult> {
  // Ninguna rama de esta función loguea `input`. La credencial no sale de la
  // llamada a compareSync, y el objeto descifrado no sale del return.
  try {
    const ctx = await requireAuth();

    // El barrido va primero: si este registro ya venció, queremos que la purga
    // lo alcance antes de leerlo, no después.
    await barridoOportunista();

    const parsed = revelarSchema.safeParse(input);
    if (!parsed.success) {
      // zod v4: los errores viven en `issues`.
      return { ok: false, message: parsed.error.issues[0]?.message ?? MSG_CREDENCIAL };
    }
    const { id, credencial } = parsed.data;

    if (!puedeIntentar(ctx.userId)) {
      return { ok: false, message: MSG_RATE };
    }

    const { ip, userAgent } = await requestMeta();

    const row = await prisma.datosPagoCifrado.findUnique({
      where: { id },
      select: {
        id: true,
        vendedorId: true,
        payload: true,
        iv: true,
        tag: true,
        vistoAt: true,
        purgadoAt: true,
        expiraAt: true,
        recordatorioResendId: true,
      },
    });
    if (!row) return { ok: false, message: MSG_NO_ENCONTRADO };

    // Alcance: el vendedor dueño, o cualquier ADMIN.
    if (row.vendedorId !== ctx.userId && ctx.role !== "ADMIN") {
      // Mismo mensaje que "no existe": no confirmamos la existencia de un
      // registro ajeno a quien no puede verlo.
      return { ok: false, message: MSG_NO_ENCONTRADO };
    }

    if (row.purgadoAt !== null) return { ok: false, message: MSG_PURGADO };
    // Vencido pero todavía sin purgar (el barrido no le llegó): para el
    // vendedor es lo mismo que borrado, y no lo descifra.
    if (row.expiraAt.getTime() < Date.now()) {
      return { ok: false, message: MSG_PURGADO };
    }
    if (!row.payload || !row.iv || !row.tag) {
      return { ok: false, message: MSG_PURGADO };
    }

    // ── Segundo factor ────────────────────────────────────────────────────
    const user = await prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { id: true, email: true, passwordHash: true, pinHash: true },
    });
    if (!user) return { ok: false, message: MSG_GENERICO };

    // Si el usuario tiene PIN y lo que tipeó tiene forma de PIN, comparamos
    // contra el pinHash; en cualquier otro caso, contra la contraseña. Un PIN
    // mal tipeado cae en la rama de contraseña y falla igual - el mensaje es
    // el mismo, así que no revela cuál de los dos factores esperábamos.
    const usaPin = !!user.pinHash && PIN_REGEX.test(credencial);
    const credencialOk = usaPin
      ? compareSync(credencial, user.pinHash!)
      : compareSync(credencial, user.passwordHash);

    if (!credencialOk) {
      contarFallo(ctx.userId);
      await logAudit({
        action: "datos.pago.revelar.fail",
        userId: ctx.userId,
        userEmail: user.email,
        targetType: "datosPagoCifrado",
        targetId: row.id,
        ipAddress: ip,
        userAgent,
        // Solo QUÉ factor se intentó. La credencial no entra a la metadata.
        metadata: { pagoId: row.id, factor: usaPin ? "pin" : "password" },
      });
      return { ok: false, message: MSG_CREDENCIAL };
    }

    // ── Descifrado ────────────────────────────────────────────────────────
    let datos: DatosRevelados;
    try {
      const claro = descifrar({ payload: row.payload, iv: row.iv, tag: row.tag });
      datos = {
        numero: claro.numero,
        vencimiento: claro.vencimiento,
        cvv: claro.cvv,
        documentoTitular: claro.documentoTitular,
        cuotas: claro.cuotas,
        extras: claro.extras ?? [],
      };
    } catch (err) {
      // Clave rotada sin migrar los registros vivos, o payload corrupto. El
      // error de node:crypto no lleva plaintext, pero igual solo logueamos el
      // id del registro.
      log.error("datos.pago.descifrar failed", { pagoId: row.id });
      void err;
      return { ok: false, message: MSG_GENERICO };
    }

    // ── Sellado + cancelación del recordatorio (best-effort) ──────────────
    // Ya lo tenemos descifrado: si algo de acá falla, el vendedor igual ve sus
    // datos. Lo peor que pasa es un recordatorio de más.
    try {
      if (row.recordatorioResendId) {
        await cancelScheduledEmail(row.recordatorioResendId);
      }
      const data: { vistoAt?: Date; recordatorioResendId?: null } = {};
      if (!row.vistoAt) data.vistoAt = new Date();
      if (row.recordatorioResendId) data.recordatorioResendId = null;
      if (Object.keys(data).length > 0) {
        await prisma.datosPagoCifrado.update({ where: { id: row.id }, data });
      }
    } catch (err) {
      log.warn(`datos.pago.sellar failed (pago ${row.id})`, err);
    }

    await logAudit({
      action: "datos.pago.revelado",
      userId: ctx.userId,
      userEmail: user.email,
      targetType: "datosPagoCifrado",
      targetId: row.id,
      ipAddress: ip,
      userAgent,
      metadata: { pagoId: row.id, vendedorId: row.vendedorId },
    });

    return { ok: true, datos };
  } catch (err) {
    // `err` acá puede venir de requireAuth o de Prisma; nunca contiene el
    // payload descifrado, que solo existe dentro del bloque de arriba.
    log.error("revelarPago failed", err);
    return { ok: false, message: MSG_GENERICO };
  }
}
