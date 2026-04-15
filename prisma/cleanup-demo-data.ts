/**
 * Cleanup demo data that was re-injected by the idempotent seed.ts on Railway startup.
 * The demo seed uses predictable string IDs (paquete-N, proveedor-N, etc.) so we can
 * safely target them without touching the real Destínico cuid-based data.
 *
 * Run once: npx tsx prisma/cleanup-demo-data.ts --confirm
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  if (!process.argv.includes('--confirm')) {
    console.log('[cleanup] Dry-run mode. Pass --confirm to actually delete.');
  }
  const confirm = process.argv.includes('--confirm');

  const demoPaquetePrefixes = ['paquete-'];
  const demoProveedorPrefixes = ['proveedor-'];
  const demoAlojamientoPrefixes = ['alojamiento-'];
  const demoTrasladoPrefixes = ['traslado-'];
  const demoAereoPrefixes = ['aereo-'];
  const demoSeguroPrefixes = ['seguro-'];
  const demoCircuitoPrefixes = ['circuito-'];
  const demoTemporadaPrefixes = ['temporada-'];
  const demoTipoPaquetePrefixes = ['tipo-paquete-', 'tipo-'];
  const demoRegimenPrefixes = ['regimen-'];
  const demoEtiquetaPrefixes = ['etiqueta-'];
  const demoPaisPrefixes = ['pais-'];
  const demoCiudadPrefixes = ['ciudad-'];

  function startsWithAny(id: string, prefixes: string[]) {
    return prefixes.some((p) => id.startsWith(p));
  }

  const [
    allPaquetes,
    allProveedores,
    allAlojamientos,
    allTraslados,
    allAereos,
    allSeguros,
    allCircuitos,
    allTemporadas,
    allTipos,
    allRegimenes,
    allEtiquetas,
    allPaises,
    allCiudades,
  ] = await Promise.all([
    prisma.paquete.findMany({ select: { id: true } }),
    prisma.proveedor.findMany({ select: { id: true } }),
    prisma.alojamiento.findMany({ select: { id: true } }),
    prisma.traslado.findMany({ select: { id: true } }),
    prisma.aereo.findMany({ select: { id: true } }),
    prisma.seguro.findMany({ select: { id: true } }),
    prisma.circuito.findMany({ select: { id: true } }),
    prisma.temporada.findMany({ select: { id: true } }),
    prisma.tipoPaquete.findMany({ select: { id: true } }),
    prisma.regimen.findMany({ select: { id: true } }),
    prisma.etiqueta.findMany({ select: { id: true } }),
    prisma.pais.findMany({ select: { id: true } }),
    prisma.ciudad.findMany({ select: { id: true } }),
  ]);

  const demoPaqueteIds = allPaquetes.filter((p) => startsWithAny(p.id, demoPaquetePrefixes)).map((p) => p.id);
  const demoProveedorIds = allProveedores.filter((p) => startsWithAny(p.id, demoProveedorPrefixes)).map((p) => p.id);
  const demoAlojamientoIds = allAlojamientos.filter((p) => startsWithAny(p.id, demoAlojamientoPrefixes)).map((p) => p.id);
  const demoTrasladoIds = allTraslados.filter((p) => startsWithAny(p.id, demoTrasladoPrefixes)).map((p) => p.id);
  const demoAereoIds = allAereos.filter((p) => startsWithAny(p.id, demoAereoPrefixes)).map((p) => p.id);
  const demoSeguroIds = allSeguros.filter((p) => startsWithAny(p.id, demoSeguroPrefixes)).map((p) => p.id);
  const demoCircuitoIds = allCircuitos.filter((p) => startsWithAny(p.id, demoCircuitoPrefixes)).map((p) => p.id);
  const demoTemporadaIds = allTemporadas.filter((p) => startsWithAny(p.id, demoTemporadaPrefixes)).map((p) => p.id);
  const demoTipoIds = allTipos.filter((p) => startsWithAny(p.id, demoTipoPaquetePrefixes)).map((p) => p.id);
  const demoRegimenIds = allRegimenes.filter((p) => startsWithAny(p.id, demoRegimenPrefixes)).map((p) => p.id);
  const demoEtiquetaIds = allEtiquetas.filter((p) => startsWithAny(p.id, demoEtiquetaPrefixes)).map((p) => p.id);
  const demoPaisIds = allPaises.filter((p) => startsWithAny(p.id, demoPaisPrefixes)).map((p) => p.id);
  const demoCiudadIds = allCiudades.filter((p) => startsWithAny(p.id, demoCiudadPrefixes)).map((p) => p.id);

  console.log('[cleanup] Demo data detected:');
  console.log(`  paquetes:     ${demoPaqueteIds.length}`);
  console.log(`  proveedores:  ${demoProveedorIds.length}`);
  console.log(`  alojamientos: ${demoAlojamientoIds.length}`);
  console.log(`  traslados:    ${demoTrasladoIds.length}`);
  console.log(`  aereos:       ${demoAereoIds.length}`);
  console.log(`  seguros:      ${demoSeguroIds.length}`);
  console.log(`  circuitos:    ${demoCircuitoIds.length}`);
  console.log(`  temporadas:   ${demoTemporadaIds.length}`);
  console.log(`  tipos:        ${demoTipoIds.length}`);
  console.log(`  regimenes:    ${demoRegimenIds.length}`);
  console.log(`  etiquetas:    ${demoEtiquetaIds.length}`);
  console.log(`  paises:       ${demoPaisIds.length}`);
  console.log(`  ciudades:     ${demoCiudadIds.length}`);

  console.log('\n[cleanup] Real data (cuid-based):');
  console.log(`  paquetes:     ${allPaquetes.length - demoPaqueteIds.length}`);
  console.log(`  proveedores:  ${allProveedores.length - demoProveedorIds.length}`);
  console.log(`  alojamientos: ${allAlojamientos.length - demoAlojamientoIds.length}`);
  console.log(`  traslados:    ${allTraslados.length - demoTrasladoIds.length}`);

  if (!confirm) {
    console.log('\n[cleanup] Dry run complete. Re-run with --confirm to delete.');
    return;
  }

  console.log('\n[cleanup] Deleting demo data...');

  await prisma.$transaction([
    // Junction tables that reference demo paquetes
    prisma.paqueteEtiqueta.deleteMany({ where: { paqueteId: { in: demoPaqueteIds } } }),
    prisma.paqueteFoto.deleteMany({ where: { paqueteId: { in: demoPaqueteIds } } }),
    prisma.paqueteAereo.deleteMany({ where: { paqueteId: { in: demoPaqueteIds } } }),
    prisma.paqueteAlojamiento.deleteMany({ where: { paqueteId: { in: demoPaqueteIds } } }),
    prisma.paqueteTraslado.deleteMany({ where: { paqueteId: { in: demoPaqueteIds } } }),
    prisma.paqueteSeguro.deleteMany({ where: { paqueteId: { in: demoPaqueteIds } } }),
    prisma.paqueteCircuito.deleteMany({ where: { paqueteId: { in: demoPaqueteIds } } }),
    prisma.opcionHotelera.deleteMany({ where: { paqueteId: { in: demoPaqueteIds } } }),

    // Also delete any junction rows referencing demo aereos/alojamientos/etc (in case
    // real paquetes linked to demo entities — unlikely, but safe)
    prisma.paqueteAereo.deleteMany({ where: { aereoId: { in: demoAereoIds } } }),
    prisma.paqueteAlojamiento.deleteMany({ where: { alojamientoId: { in: demoAlojamientoIds } } }),
    prisma.paqueteTraslado.deleteMany({ where: { trasladoId: { in: demoTrasladoIds } } }),
    prisma.paqueteSeguro.deleteMany({ where: { seguroId: { in: demoSeguroIds } } }),
    prisma.paqueteCircuito.deleteMany({ where: { circuitoId: { in: demoCircuitoIds } } }),

    // Delete demo paquetes
    prisma.paquete.deleteMany({ where: { id: { in: demoPaqueteIds } } }),

    // Price tables owned by demo parents
    prisma.precioAereo.deleteMany({ where: { aereoId: { in: demoAereoIds } } }),
    prisma.precioAlojamiento.deleteMany({ where: { alojamientoId: { in: demoAlojamientoIds } } }),
    prisma.precioCircuito.deleteMany({ where: { circuitoId: { in: demoCircuitoIds } } }),
    prisma.circuitoDia.deleteMany({ where: { circuitoId: { in: demoCircuitoIds } } }),
    prisma.alojamientoFoto.deleteMany({ where: { alojamientoId: { in: demoAlojamientoIds } } }),

    // Delete demo entities
    prisma.aereo.deleteMany({ where: { id: { in: demoAereoIds } } }),
    prisma.alojamiento.deleteMany({ where: { id: { in: demoAlojamientoIds } } }),
    prisma.traslado.deleteMany({ where: { id: { in: demoTrasladoIds } } }),
    prisma.seguro.deleteMany({ where: { id: { in: demoSeguroIds } } }),
    prisma.circuito.deleteMany({ where: { id: { in: demoCircuitoIds } } }),
    prisma.proveedor.deleteMany({ where: { id: { in: demoProveedorIds } } }),

    // Catalogs
    prisma.etiqueta.deleteMany({ where: { id: { in: demoEtiquetaIds } } }),
    prisma.temporada.deleteMany({ where: { id: { in: demoTemporadaIds } } }),
    prisma.tipoPaquete.deleteMany({ where: { id: { in: demoTipoIds } } }),
    prisma.regimen.deleteMany({ where: { id: { in: demoRegimenIds } } }),
    prisma.ciudad.deleteMany({ where: { id: { in: demoCiudadIds } } }),
    prisma.pais.deleteMany({ where: { id: { in: demoPaisIds } } }),
  ]);

  const finalPaquetes = await prisma.paquete.count();
  const finalProveedores = await prisma.proveedor.count();
  const finalAlojamientos = await prisma.alojamiento.count();
  const finalUsers = await prisma.user.count();

  console.log('\n[cleanup] Done. Final counts:');
  console.log(`  paquetes:     ${finalPaquetes}`);
  console.log(`  proveedores:  ${finalProveedores}`);
  console.log(`  alojamientos: ${finalAlojamientos}`);
  console.log(`  users:        ${finalUsers}`);
}

main()
  .catch((e) => {
    console.error('[cleanup] Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
