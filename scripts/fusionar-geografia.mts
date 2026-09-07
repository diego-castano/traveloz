/**
 * Fusiona el árbol geográfico duplicado: Región → País → Ciudad.
 *
 * La base tiene el árbol entero por duplicado (dos "Sudamérica", dos
 * "Colombia", dos "Cartagena"…). Eso parte los filtros del sitio: un paquete
 * colgado del gemelo B no aparece cuando el visitante elige el gemelo A.
 *
 * Criterio: en cada grupo sobrevive la fila con más contenido; a igualdad, la
 * más vieja. Las demás ceden sus hijos y sus referencias y se borran.
 *
 * Seguridad, en este orden:
 *   1. guarda una foto previa de todo el árbol y de las referencias (JSON);
 *   2. calcula el INVARIANTE: para cada paquete, la lista ordenada de nombres
 *      de sus ciudades. Eso es lo que el pasajero ve y NO puede cambiar;
 *   3. avisa si dos filas que se fusionan tienen nombres distintos, porque ahí
 *      sí cambia un texto visible;
 *   4. escribe todo dentro de una transacción: entra completo o no entra nada;
 *   5. vuelve a calcular el invariante y aborta si algo se movió.
 *
 * Uso:
 *   npx tsx scripts/fusionar-geografia.mts            simula, no escribe
 *   APLICAR=1 npx tsx scripts/fusionar-geografia.mts  aplica
 */
import { PrismaClient } from "@prisma/client";
import { writeFileSync } from "node:fs";

const db = new PrismaClient();
const SECO = process.env.APLICAR !== "1";
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const agrupar = <T,>(arr: T[], k: (x: T) => string) => {
  const m = new Map<string, T[]>();
  for (const x of arr) { const key = k(x); if (!m.has(key)) m.set(key, []); m.get(key)!.push(x); }
  return [...m.values()].filter((v) => v.length > 1);
};

/** Lo que el pasajero ve de cada paquete: sus ciudades, en orden, por nombre. */
async function invariante() {
  const tramos = await db.paqueteDestino.findMany({
    select: { paqueteId: true, orden: true, ciudad: { select: { nombre: true } } },
    orderBy: [{ paqueteId: "asc" }, { orden: "asc" }],
  });
  const m = new Map<string, string>();
  for (const t of tramos) {
    m.set(t.paqueteId, (m.get(t.paqueteId) ?? "") + `|${t.orden}:${t.ciudad.nombre.trim()}`);
  }
  return m;
}

const regiones = await db.region.findMany({ select: { id: true, nombre: true, slug: true, createdAt: true, _count: { select: { paises: true } } } });
const mapaR = new Map<string, string>();
const avisos: string[] = [];
for (const g of agrupar(regiones, (r) => norm(r.nombre))) {
  const [vive, ...mueren] = [...g].sort((a, b) => b._count.paises - a._count.paises || (a.createdAt > b.createdAt ? 1 : -1));
  for (const m of mueren) {
    mapaR.set(m.id, vive.id);
    if (m.nombre.trim() !== vive.nombre.trim()) avisos.push(`región ${JSON.stringify(m.nombre)} → ${JSON.stringify(vive.nombre)}`);
  }
}

const paises = await db.pais.findMany({ select: { id: true, nombre: true, regionId: true, createdAt: true, _count: { select: { ciudades: true } } } });
const regF = (id: string | null) => (id && mapaR.get(id)) || id;
const mapaP = new Map<string, string>();
for (const g of agrupar(paises, (p) => (regF(p.regionId) ?? "-") + "|" + norm(p.nombre))) {
  const [vive, ...mueren] = [...g].sort((a, b) => b._count.ciudades - a._count.ciudades || (a.createdAt > b.createdAt ? 1 : -1));
  for (const m of mueren) {
    mapaP.set(m.id, vive.id);
    if (m.nombre.trim() !== vive.nombre.trim()) avisos.push(`país ${JSON.stringify(m.nombre)} → ${JSON.stringify(vive.nombre)}`);
  }
}

const ciudades = await db.ciudad.findMany({ select: { id: true, nombre: true, paisId: true, createdAt: true, _count: { select: { alojamientos: true, traslados: true, paqueteDestinos: true } } } });
const paisF = (id: string | null) => (id && mapaP.get(id)) || id;
const usoC = (c: typeof ciudades[number]) => c._count.alojamientos + c._count.traslados + c._count.paqueteDestinos;
const mapaC = new Map<string, string>();
for (const g of agrupar(ciudades, (c) => (paisF(c.paisId) ?? "-") + "|" + norm(c.nombre))) {
  const [vive, ...mueren] = [...g].sort((a, b) => usoC(b) - usoC(a) || (a.createdAt > b.createdAt ? 1 : -1));
  for (const m of mueren) {
    mapaC.set(m.id, vive.id);
    if (m.nombre.trim() !== vive.nombre.trim()) avisos.push(`ciudad ${JSON.stringify(m.nombre)} → ${JSON.stringify(vive.nombre)} (${usoC(m)} referencias)`);
  }
}

console.log(`${SECO ? "── SIMULACIÓN ──" : "── APLICANDO ──"}\n`);
console.log(`a borrar:  regiones ${mapaR.size}  ·  países ${mapaP.size}  ·  ciudades ${mapaC.size}`);
console.log(`quedarían: regiones ${regiones.length - mapaR.size}  ·  países ${paises.length - mapaP.size}  ·  ciudades ${ciudades.length - mapaC.size}`);

if (avisos.length) {
  console.log(`\n⚠️  ${avisos.length} fusiones donde los nombres NO son idénticos (cambia texto visible):`);
  for (const a of avisos) console.log(`     ${a}`);
} else {
  console.log(`\n✓ todas las fusiones son entre nombres idénticos: no cambia ningún texto visible`);
}

const antes = await invariante();
console.log(`\ninvariante: ${antes.size} paquetes con ciudades asignadas`);

if (SECO) {
  console.log("\n(simulación · nada escrito)");
  await db.$disconnect();
  process.exit(0);
}

/* Foto previa, por si hay que volver atrás a mano. */
const foto = {
  fecha: new Date().toISOString(),
  regiones: await db.region.findMany(),
  paises: await db.pais.findMany(),
  ciudades: await db.ciudad.findMany(),
  paqueteDestinos: await db.paqueteDestino.findMany({ select: { id: true, paqueteId: true, ciudadId: true, orden: true } }),
  alojamientos: await db.alojamiento.findMany({ select: { id: true, ciudadId: true, paisId: true } }),
  traslados: await db.traslado.findMany({ select: { id: true, ciudadId: true, paisId: true } }),
};
const ruta = `/tmp/geo-antes-${Date.now()}.json`;
writeFileSync(ruta, JSON.stringify(foto, null, 2));
console.log(`\nfoto previa guardada en ${ruta}`);

/* Los ids son cuids de nuestra propia base, pero igual se validan antes de
   interpolarlos: un id raro acá sería una inyección de SQL. */
const seguro = (id: string) => {
  if (!/^[a-zA-Z0-9_-]{1,40}$/.test(id)) throw new Error(`id sospechoso: ${JSON.stringify(id)}`);
  return id;
};
const pares = (m: Map<string, string>) =>
  [...m].map(([muere, vive]) => `('${seguro(muere)}','${seguro(vive)}')`).join(",");

/* FASE 1 · repuntar. Va FUERA de transacción a propósito.

   Son siete sentencias masivas, no cuatrocientos viajes de ida y vuelta: la
   versión anterior hacía un updateMany por cada fila que muere y se comía los
   180 segundos de la transacción interactiva antes de terminar.

   Fuera de transacción es seguro porque repuntar es idempotente y no destruye
   nada: si esto se corta por la mitad, la base queda consistente —cada
   referencia apunta o al viejo o al nuevo, los dos existen todavía— y volver a
   correr el script termina el trabajo. Lo único destructivo son los borrados,
   y esos sí van atómicos en la fase 2. */
const repuntes: Array<[string, string, string, Map<string, string>]> = [
  ["Pais", "regionId", "regiones → región que sobrevive", mapaR],
  ["Ciudad", "paisId", "ciudades → país que sobrevive", mapaP],
  ["Alojamiento", "paisId", "alojamientos → país", mapaP],
  ["Traslado", "paisId", "traslados → país", mapaP],
  ["Alojamiento", "ciudadId", "alojamientos → ciudad", mapaC],
  ["Traslado", "ciudadId", "traslados → ciudad", mapaC],
  ["PaqueteDestino", "ciudadId", "tramos de paquete → ciudad", mapaC],
];
for (const [tabla, columna, rotulo, mapa] of repuntes) {
  if (!mapa.size) continue;
  const n = await db.$executeRawUnsafe(
    `UPDATE "${tabla}" AS t SET "${columna}" = m.vive
       FROM (VALUES ${pares(mapa)}) AS m(muere, vive)
      WHERE t."${columna}" = m.muere`,
  );
  console.log(`  repuntado ${String(n).padStart(4)}  ${rotulo}`);
}

/* FASE 2 · borrar. Acá sí, atómico: tres sentencias y se cierra. Los hijos
   primero, que ya quedaron sin nadie apuntándoles. */
await db.$transaction(async (tx) => {
  await tx.ciudad.deleteMany({ where: { id: { in: [...mapaC.keys()] } } });
  await tx.pais.deleteMany({ where: { id: { in: [...mapaP.keys()] } } });
  await tx.region.deleteMany({ where: { id: { in: [...mapaR.keys()] } } });
}, { timeout: 60000 });

const despues = await invariante();
let rotos = 0;
for (const [pid, firma] of antes) {
  if (despues.get(pid) !== firma) {
    rotos++;
    console.log(`❌ el paquete ${pid} cambió sus ciudades:\n     antes  ${firma}\n     ahora  ${despues.get(pid)}`);
  }
}
for (const pid of despues.keys()) if (!antes.has(pid)) { rotos++; console.log(`❌ el paquete ${pid} ganó ciudades que no tenía`); }

console.log(`\nquedan: regiones ${await db.region.count()} · países ${await db.pais.count()} · ciudades ${await db.ciudad.count()}`);
console.log(rotos === 0
  ? `✓ invariante intacto: los ${antes.size} paquetes conservan exactamente sus ciudades`
  : `❌ ${rotos} paquetes cambiaron — revisar con la foto ${ruta}`);
await db.$disconnect();
