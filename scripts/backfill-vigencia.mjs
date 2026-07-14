/**
 * Backfill de vigencia a la regla nueva.
 *
 * Regla del negocio: el paquete se da de baja automáticamente 15 días antes
 * del inicio del viaje (validezHasta = viajeDesde − 15 días). Sin viajeDesde
 * no hay fecha de baja (validezHasta = null → activo indefinido). validezDesde
 * no se toca (dejó de gestionarse; su valor existente se conserva).
 *
 * Recorre TODOS los paquetes no borrados (deletedAt = null) y reescribe
 * validezHasta según la regla. Idempotente: sólo actualiza las filas cuyo
 * validezHasta calculado difiere del guardado, así que correrlo dos veces
 * seguidas reporta 0 cambios en la segunda pasada.
 *
 * Uso:
 *   node scripts/backfill-vigencia.mjs --dry   # simula, no escribe
 *   node scripts/backfill-vigencia.mjs         # aplica los cambios
 *
 * NO ejecutar contra una DB remota sin intención: lee DATABASE_URL del entorno.
 * Written as plain ESM JS (mismo estilo que scripts/ensure-protected-admin.mjs)
 * para no depender de tsx.
 */

import { PrismaClient } from "@prisma/client";

const DRY = process.argv.includes("--dry");

/**
 * Devuelve la fecha de baja (YYYY-MM-DD) a partir de viajeDesde restando
 * `days` días de calendario, o null si no hay viajeDesde. Acepta viajeDesde
 * como "YYYY-MM-DD" o timestamp ISO (usa sólo la parte de fecha). Trabaja en
 * UTC para que el resultado sea determinístico sin importar la zona horaria
 * de la máquina que corre el script.
 */
function bajaDate(viajeDesde, days) {
  if (!viajeDesde) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(viajeDesde).trim());
  if (!match) return null;
  const [, y, m, d] = match;
  const dt = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  dt.setUTCDate(dt.getUTCDate() - days);
  const yyyy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.warn("[backfill-vigencia] DATABASE_URL no está seteada — abortando.");
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const paquetes = await prisma.paquete.findMany({
      where: { deletedAt: null },
      select: { id: true, viajeDesde: true, validezHasta: true },
    });

    console.log(
      `[backfill-vigencia] ${DRY ? "DRY-RUN — " : ""}${paquetes.length} paquetes no borrados.`,
    );

    let cambiados = 0;
    let sinCambio = 0;
    for (const p of paquetes) {
      const nuevo = bajaDate(p.viajeDesde, 15); // string | null
      if (nuevo === p.validezHasta) {
        sinCambio++;
        continue;
      }
      cambiados++;
      console.log(
        `  ${p.id}: validezHasta ${p.validezHasta ?? "null"} → ${nuevo ?? "null"} (viajeDesde ${p.viajeDesde ?? "null"})`,
      );
      if (!DRY) {
        await prisma.paquete.update({
          where: { id: p.id },
          data: { validezHasta: nuevo },
        });
      }
    }

    console.log(
      `[backfill-vigencia] ${DRY ? "Simulado" : "Aplicado"}: ${cambiados} cambiados, ${sinCambio} sin cambio.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("[backfill-vigencia] FALLÓ:", err);
  process.exit(1);
});
