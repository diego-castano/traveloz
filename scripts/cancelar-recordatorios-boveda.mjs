/**
 * Cancela en Resend los recordatorios "los datos de pago vencen mañana" que
 * quedaron agendados antes de sacar el vencimiento de la bóveda (28/09).
 *
 * Desde ese cambio no se agenda ninguno nuevo, pero los que ya estaban en
 * Resend salen igual en su fecha. Este script los busca por
 * `DatosPagoCifrado.recordatorioResendId`, los cancela contra la API y deja el
 * campo en null. Un id que Resend ya no puede cancelar (ya salió, o no existe)
 * también se limpia: no hay nada más que hacer con él.
 *
 * No toca payload, fechas ni ningún otro campo. Idempotente: una segunda
 * corrida encuentra 0.
 *
 * Uso (con DATABASE_URL y RESEND_API_KEY de producción en el entorno):
 *   node scripts/cancelar-recordatorios-boveda.mjs --dry   # solo lista
 *   node scripts/cancelar-recordatorios-boveda.mjs         # cancela
 *
 * En Railway: `railway run node scripts/cancelar-recordatorios-boveda.mjs`
 * desde el servicio traveloz.
 */

import { PrismaClient } from "@prisma/client";

const dry = process.argv.includes("--dry");
const apiKey = process.env.RESEND_API_KEY;
if (!apiKey && !dry) {
  console.error("Falta RESEND_API_KEY: no hay contra qué cancelar.");
  process.exit(1);
}

const prisma = new PrismaClient();

try {
  const filas = await prisma.datosPagoCifrado.findMany({
    where: { recordatorioResendId: { not: null } },
    select: { id: true, recordatorioResendId: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  console.log(`${filas.length} recordatorio(s) agendado(s).${dry ? " (dry run)" : ""}`);

  let cancelados = 0;
  for (const f of filas) {
    if (dry) {
      console.log(`  ${f.id} · cargado ${f.createdAt.toISOString()} · resend ${f.recordatorioResendId}`);
      continue;
    }
    const res = await fetch(`https://api.resend.com/emails/${f.recordatorioResendId}/cancel`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    });
    if (res.ok) cancelados++;
    else console.log(`  ${f.id}: Resend respondió ${res.status} (ya salió o no existe) — se limpia igual`);
    await prisma.datosPagoCifrado.update({
      where: { id: f.id },
      data: { recordatorioResendId: null },
    });
  }
  if (!dry) console.log(`Cancelados: ${cancelados} de ${filas.length}.`);
} finally {
  await prisma.$disconnect();
}
