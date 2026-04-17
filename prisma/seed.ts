import { PrismaClient } from '@prisma/client';
import { hashSync } from 'bcryptjs';
import {
  SEED_TEMPORADAS,
  SEED_TIPOS_PAQUETE,
  SEED_REGIMENES,
  SEED_REGIONES,
  SEED_PAISES,
  SEED_CIUDADES,
  SEED_ETIQUETAS,
  SEED_PROVEEDORES,
  SEED_AEREOS,
  SEED_PRECIOS_AEREO,
  SEED_ALOJAMIENTOS,
  SEED_PRECIOS_ALOJAMIENTO,
  SEED_ALOJAMIENTO_FOTOS,
  SEED_TRASLADOS,
  SEED_SEGUROS,
  SEED_CIRCUITOS,
  SEED_CIRCUITO_DIAS,
  SEED_PRECIOS_CIRCUITO,
  SEED_PAQUETES,
  SEED_PAQUETE_AEREOS,
  SEED_PAQUETE_ALOJAMIENTOS,
  SEED_PAQUETE_TRASLADOS,
  SEED_PAQUETE_SEGUROS,
  SEED_PAQUETE_CIRCUITOS,
  SEED_PAQUETE_FOTOS,
  SEED_PAQUETE_ETIQUETAS,
  SEED_OPCIONES_HOTELERAS,
} from '../src/lib/data';
import { DEMO_USERS } from '../src/lib/auth';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Helper: upsertMany — insert if not exists, skip if exists (non-destructive)
// ---------------------------------------------------------------------------
async function upsertById<T extends { id: string }>(
  model: any,
  records: T[],
  mapFn: (r: T) => any,
) {
  let created = 0;
  for (const r of records) {
    const data = mapFn(r);
    const existing = await model.findUnique({ where: { id: r.id } });
    if (!existing) {
      await model.create({ data: { id: r.id, ...data } });
      created++;
    }
  }
  return created;
}

async function main() {
  console.log('Seeding database (non-destructive upsert mode)...');

  // ---------------------------------------------------------------------------
  // Seed default admin user: admin@admin.com / 123456
  // ---------------------------------------------------------------------------
  const defaultAdminHash = hashSync('123456', 10);
  const existingAdmin = await prisma.user.findUnique({ where: { email: 'admin@admin.com' } });
  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        id: 'user-admin-default',
        email: 'admin@admin.com',
        name: 'Admin TravelOz',
        role: 'ADMIN' as any,
        brandId: 'brand-1',
        passwordHash: defaultAdminHash,
      },
    });
    console.log('Created default admin: admin@admin.com / 123456');
  } else {
    console.log('Default admin already exists, skipping');
  }

  // ---------------------------------------------------------------------------
  // Seed demo users (non-destructive)
  // ---------------------------------------------------------------------------
  const demoHash = hashSync('admin', 10);
  for (const u of DEMO_USERS) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (!existing) {
      await prisma.user.create({
        data: {
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role as any,
          brandId: u.brandId,
          passwordHash: demoHash,
        },
      });
    }
  }
  console.log(`Checked ${DEMO_USERS.length} demo users`);

  // ---------------------------------------------------------------------------
  // Seed Temporadas
  // ---------------------------------------------------------------------------
  await prisma.temporada.createMany({
    skipDuplicates: true,
    data: SEED_TEMPORADAS.map((t) => ({
      id: t.id,
      brandId: t.brandId,
      nombre: t.nombre,
      orden: t.orden,
      activa: t.activa,
      createdAt: new Date(t.createdAt),
      updatedAt: new Date(t.updatedAt),
    })),
  });
  console.log(`Ensured ${SEED_TEMPORADAS.length} temporadas`);

  // ---------------------------------------------------------------------------
  // Seed TipoPaquete
  // ---------------------------------------------------------------------------
  await prisma.tipoPaquete.createMany({
    skipDuplicates: true,
    data: SEED_TIPOS_PAQUETE.map((t) => ({
      id: t.id,
      brandId: t.brandId,
      nombre: t.nombre,
      orden: t.orden,
      activo: t.activo,
      createdAt: new Date(t.createdAt),
      updatedAt: new Date(t.updatedAt),
    })),
  });
  console.log(`Ensured ${SEED_TIPOS_PAQUETE.length} tipos de paquete`);

  // ---------------------------------------------------------------------------
  // Seed Etiquetas
  // ---------------------------------------------------------------------------
  await prisma.etiqueta.createMany({
    skipDuplicates: true,
    data: SEED_ETIQUETAS.map((t) => ({
      id: t.id,
      brandId: t.brandId,
      nombre: t.nombre,
      slug: t.slug,
      color: t.color,
      createdAt: new Date(t.createdAt),
      updatedAt: new Date(t.updatedAt),
    })),
  });
  console.log(`Ensured ${SEED_ETIQUETAS.length} etiquetas`);

  // ---------------------------------------------------------------------------
  // Seed Regimenes
  // ---------------------------------------------------------------------------
  await prisma.regimen.createMany({
    skipDuplicates: true,
    data: SEED_REGIMENES.map((t) => ({
      id: t.id,
      brandId: t.brandId,
      nombre: t.nombre,
      abrev: t.abrev,
      createdAt: new Date(t.createdAt),
      updatedAt: new Date(t.updatedAt),
    })),
  });
  console.log(`Ensured ${SEED_REGIMENES.length} regimenes`);

  // ---------------------------------------------------------------------------
  // Seed Regiones (must run BEFORE Paises — Pais.regionId references Region.id)
  // ---------------------------------------------------------------------------
  await prisma.region.createMany({
    skipDuplicates: true,
    data: SEED_REGIONES.map((r) => ({
      id: r.id,
      brandId: r.brandId,
      nombre: r.nombre,
      slug: r.slug,
      orden: r.orden,
      createdAt: new Date(r.createdAt),
      updatedAt: new Date(r.updatedAt),
    })),
  });
  console.log(`Ensured ${SEED_REGIONES.length} regiones`);

  // ---------------------------------------------------------------------------
  // Seed Paises
  // ---------------------------------------------------------------------------
  await prisma.pais.createMany({
    skipDuplicates: true,
    data: SEED_PAISES.map((t) => ({
      id: t.id,
      brandId: t.brandId,
      nombre: t.nombre,
      codigo: t.codigo,
      regionId: t.regionId,
      createdAt: new Date(t.createdAt),
      updatedAt: new Date(t.updatedAt),
    })),
  });
  console.log(`Ensured ${SEED_PAISES.length} paises`);

  // ---------------------------------------------------------------------------
  // Backfill: assign regionId to existing Paises that don't have one yet.
  // Uses an explicit country->region slug mapping that covers both the base
  // SEED_PAISES and the extended catalog added in later seeds (Jamaica, Aruba,
  // Panamá, Tailandia, etc). Idempotent: only updates rows where regionId IS NULL.
  // ---------------------------------------------------------------------------
  const countryToRegionSlug: Record<string, string> = {
    // Europa
    España: "europa", Francia: "europa", Italia: "europa", Portugal: "europa",
    Grecia: "europa", Turquía: "europa", Espana: "europa",
    // Estados Unidos
    "Estados Unidos": "estados-unidos",
    // Asia (incl. Middle East and Africa buckets until dedicated regions exist)
    Tailandia: "asia", India: "asia", Nepal: "asia", Camboya: "asia",
    Filipinas: "asia", "Emiratos Árabes": "asia", Egipto: "asia", Sudáfrica: "asia",
    // Caribe
    México: "caribe", Mexico: "caribe", "República Dominicana": "caribe",
    "Republica Dominicana": "caribe", Cuba: "caribe", Jamaica: "caribe",
    Aruba: "caribe", Curazao: "caribe", "Costa Rica": "caribe", Panamá: "caribe",
    // Sudamérica
    Argentina: "sudamerica", Chile: "sudamerica", Perú: "sudamerica",
    Colombia: "sudamerica", Uruguay: "sudamerica",
    // Brasil
    Brasil: "brasil",
  };

  const regionIdByBrandSlug = new Map<string, string>();
  for (const r of SEED_REGIONES) regionIdByBrandSlug.set(`${r.brandId}:${r.slug}`, r.id);
  // Also include regions already in DB that weren't in SEED_REGIONES (just in case)
  const dbRegiones = await prisma.region.findMany();
  for (const r of dbRegiones) regionIdByBrandSlug.set(`${r.brandId}:${r.slug}`, r.id);

  const paisesSinRegion = await prisma.pais.findMany({
    where: { regionId: null },
  });
  let backfilled = 0;
  for (const pais of paisesSinRegion) {
    const slug = countryToRegionSlug[pais.nombre];
    if (!slug) continue;
    const regionId = regionIdByBrandSlug.get(`${pais.brandId}:${slug}`);
    if (!regionId) continue;
    await prisma.pais.update({ where: { id: pais.id }, data: { regionId } });
    backfilled++;
  }
  if (backfilled > 0) console.log(`Backfilled regionId on ${backfilled} existing paises`);

  // ---------------------------------------------------------------------------
  // Seed Ciudades
  // ---------------------------------------------------------------------------
  await prisma.ciudad.createMany({
    skipDuplicates: true,
    data: SEED_CIUDADES.map((t) => ({
      id: t.id,
      paisId: t.paisId,
      nombre: t.nombre,
      createdAt: new Date(t.createdAt),
      updatedAt: new Date(t.updatedAt),
    })),
  });
  console.log(`Ensured ${SEED_CIUDADES.length} ciudades`);

  // ---------------------------------------------------------------------------
  // Seed Proveedores
  // ---------------------------------------------------------------------------
  await prisma.proveedor.createMany({
    skipDuplicates: true,
    data: SEED_PROVEEDORES.map((t) => ({
      id: t.id,
      brandId: t.brandId,
      nombre: t.nombre,
      contacto: t.contacto,
      email: t.email,
      telefono: t.telefono,
      notas: t.notas,
      servicio: t.servicio as any,
      createdAt: new Date(t.createdAt),
      updatedAt: new Date(t.updatedAt),
      deletedAt: t.deletedAt ? new Date(t.deletedAt) : null,
    })),
  });
  console.log(`Ensured ${SEED_PROVEEDORES.length} proveedores`);

  // ---------------------------------------------------------------------------
  // Seed Aereos
  // ---------------------------------------------------------------------------
  await prisma.aereo.createMany({
    skipDuplicates: true,
    data: SEED_AEREOS.map((t) => ({
      id: t.id,
      brandId: t.brandId,
      ruta: t.ruta,
      destino: t.destino,
      aerolinea: t.aerolinea,
      equipaje: t.equipaje,
      itinerario: t.itinerario,
      escalas: t.escalas,
      codigoVueloIda: t.codigoVueloIda,
      codigoVueloVuelta: t.codigoVueloVuelta,
      duracionIda: t.duracionIda,
      duracionVuelta: t.duracionVuelta,
      createdAt: new Date(t.createdAt),
      updatedAt: new Date(t.updatedAt),
      deletedAt: t.deletedAt ? new Date(t.deletedAt) : null,
    })),
  });
  console.log(`Ensured ${SEED_AEREOS.length} aereos`);

  // ---------------------------------------------------------------------------
  // Seed PrecioAereo
  // ---------------------------------------------------------------------------
  await prisma.precioAereo.createMany({
    skipDuplicates: true,
    data: SEED_PRECIOS_AEREO.map((t) => ({
      id: t.id,
      aereoId: t.aereoId,
      periodoDesde: t.periodoDesde,
      periodoHasta: t.periodoHasta,
      precioAdulto: t.precioAdulto,
    })),
  });
  console.log(`Ensured ${SEED_PRECIOS_AEREO.length} precios aereo`);

  // ---------------------------------------------------------------------------
  // Seed Alojamientos
  // ---------------------------------------------------------------------------
  await prisma.alojamiento.createMany({
    skipDuplicates: true,
    data: SEED_ALOJAMIENTOS.map((t) => ({
      id: t.id,
      brandId: t.brandId,
      nombre: t.nombre,
      ciudadId: t.ciudadId,
      paisId: t.paisId,
      categoria: t.categoria,
      sitioWeb: t.sitioWeb,
      createdAt: new Date(t.createdAt),
      updatedAt: new Date(t.updatedAt),
      deletedAt: t.deletedAt ? new Date(t.deletedAt) : null,
    })),
  });
  console.log(`Ensured ${SEED_ALOJAMIENTOS.length} alojamientos`);

  // ---------------------------------------------------------------------------
  // Seed PrecioAlojamiento
  // ---------------------------------------------------------------------------
  await prisma.precioAlojamiento.createMany({
    skipDuplicates: true,
    data: SEED_PRECIOS_ALOJAMIENTO.map((t) => ({
      id: t.id,
      alojamientoId: t.alojamientoId,
      periodoDesde: t.periodoDesde,
      periodoHasta: t.periodoHasta,
      precioPorNoche: t.precioPorNoche,
      regimenId: t.regimenId,
    })),
  });
  console.log(`Ensured ${SEED_PRECIOS_ALOJAMIENTO.length} precios alojamiento`);

  // ---------------------------------------------------------------------------
  // Seed AlojamientoFoto
  // ---------------------------------------------------------------------------
  await prisma.alojamientoFoto.createMany({
    skipDuplicates: true,
    data: SEED_ALOJAMIENTO_FOTOS.map((t) => ({
      id: t.id,
      alojamientoId: t.alojamientoId,
      url: t.url,
      alt: t.alt,
      orden: t.orden,
    })),
  });
  console.log(`Ensured ${SEED_ALOJAMIENTO_FOTOS.length} alojamiento fotos`);

  // ---------------------------------------------------------------------------
  // Seed Traslados
  // ---------------------------------------------------------------------------
  await prisma.traslado.createMany({
    skipDuplicates: true,
    data: SEED_TRASLADOS.map((t) => ({
      id: t.id,
      brandId: t.brandId,
      nombre: t.nombre,
      tipo: t.tipo as any,
      ciudadId: t.ciudadId,
      paisId: t.paisId,
      proveedorId: t.proveedorId,
      precio: t.precio,
      createdAt: new Date(t.createdAt),
      updatedAt: new Date(t.updatedAt),
      deletedAt: t.deletedAt ? new Date(t.deletedAt) : null,
    })),
  });
  console.log(`Ensured ${SEED_TRASLADOS.length} traslados`);

  // ---------------------------------------------------------------------------
  // Seed Seguros
  // ---------------------------------------------------------------------------
  await prisma.seguro.createMany({
    skipDuplicates: true,
    data: SEED_SEGUROS.map((t) => ({
      id: t.id,
      brandId: t.brandId,
      proveedorId: t.proveedorId,
      plan: t.plan,
      cobertura: t.cobertura,
      costoPorDia: t.costoPorDia,
      createdAt: new Date(t.createdAt),
      updatedAt: new Date(t.updatedAt),
      deletedAt: t.deletedAt ? new Date(t.deletedAt) : null,
    })),
  });
  console.log(`Ensured ${SEED_SEGUROS.length} seguros`);

  // ---------------------------------------------------------------------------
  // Seed Circuitos
  // ---------------------------------------------------------------------------
  await prisma.circuito.createMany({
    skipDuplicates: true,
    data: SEED_CIRCUITOS.map((t) => ({
      id: t.id,
      brandId: t.brandId,
      nombre: t.nombre,
      noches: t.noches,
      proveedorId: t.proveedorId,
      createdAt: new Date(t.createdAt),
      updatedAt: new Date(t.updatedAt),
      deletedAt: t.deletedAt ? new Date(t.deletedAt) : null,
    })),
  });
  console.log(`Ensured ${SEED_CIRCUITOS.length} circuitos`);

  // ---------------------------------------------------------------------------
  // Seed CircuitoDia
  // ---------------------------------------------------------------------------
  await prisma.circuitoDia.createMany({
    skipDuplicates: true,
    data: SEED_CIRCUITO_DIAS.map((t) => ({
      id: t.id,
      circuitoId: t.circuitoId,
      numeroDia: t.numeroDia,
      titulo: t.titulo,
      descripcion: t.descripcion,
      orden: t.orden,
    })),
  });
  console.log(`Ensured ${SEED_CIRCUITO_DIAS.length} circuito dias`);

  // ---------------------------------------------------------------------------
  // Seed PrecioCircuito
  // ---------------------------------------------------------------------------
  await prisma.precioCircuito.createMany({
    skipDuplicates: true,
    data: SEED_PRECIOS_CIRCUITO.map((t) => ({
      id: t.id,
      circuitoId: t.circuitoId,
      periodoDesde: t.periodoDesde,
      periodoHasta: t.periodoHasta,
      precio: t.precio,
    })),
  });
  console.log(`Ensured ${SEED_PRECIOS_CIRCUITO.length} precios circuito`);

  // ---------------------------------------------------------------------------
  // Seed Paquetes
  // ---------------------------------------------------------------------------
  await prisma.paquete.createMany({
    skipDuplicates: true,
    data: SEED_PAQUETES.map((t) => ({
      id: t.id,
      brandId: t.brandId,
      titulo: t.titulo,
      destino: t.destino,
      descripcion: t.descripcion,
      textoVisual: t.textoVisual,
      noches: t.noches,
      salidas: t.salidas,
      temporadaId: t.temporadaId,
      tipoPaqueteId: t.tipoPaqueteId,
      validezDesde: t.validezDesde,
      validezHasta: t.validezHasta,
      estado: t.estado as any,
      destacado: t.destacado,
      netoCalculado: t.netoCalculado,
      markup: t.markup,
      precioVenta: t.precioVenta,
      moneda: t.moneda,
      ordenServicios: t.ordenServicios,
      createdAt: new Date(t.createdAt),
      updatedAt: new Date(t.updatedAt),
      deletedAt: t.deletedAt ? new Date(t.deletedAt) : null,
    })),
  });
  console.log(`Ensured ${SEED_PAQUETES.length} paquetes`);

  // ---------------------------------------------------------------------------
  // Seed PaqueteAereo
  // ---------------------------------------------------------------------------
  await prisma.paqueteAereo.createMany({
    skipDuplicates: true,
    data: SEED_PAQUETE_AEREOS.map((t) => ({
      id: t.id,
      paqueteId: t.paqueteId,
      aereoId: t.aereoId,
      textoDisplay: t.textoDisplay,
      orden: t.orden,
    })),
  });
  console.log(`Ensured ${SEED_PAQUETE_AEREOS.length} paquete aereos`);

  // ---------------------------------------------------------------------------
  // Seed PaqueteAlojamiento
  // ---------------------------------------------------------------------------
  await prisma.paqueteAlojamiento.createMany({
    skipDuplicates: true,
    data: SEED_PAQUETE_ALOJAMIENTOS.map((t) => ({
      id: t.id,
      paqueteId: t.paqueteId,
      alojamientoId: t.alojamientoId,
      nochesEnEste: t.nochesEnEste,
      textoDisplay: t.textoDisplay,
      orden: t.orden,
    })),
  });
  console.log(`Ensured ${SEED_PAQUETE_ALOJAMIENTOS.length} paquete alojamientos`);

  // ---------------------------------------------------------------------------
  // Seed PaqueteTraslado
  // ---------------------------------------------------------------------------
  await prisma.paqueteTraslado.createMany({
    skipDuplicates: true,
    data: SEED_PAQUETE_TRASLADOS.map((t) => ({
      id: t.id,
      paqueteId: t.paqueteId,
      trasladoId: t.trasladoId,
      textoDisplay: t.textoDisplay,
      orden: t.orden,
    })),
  });
  console.log(`Ensured ${SEED_PAQUETE_TRASLADOS.length} paquete traslados`);

  // ---------------------------------------------------------------------------
  // Seed PaqueteSeguro
  // ---------------------------------------------------------------------------
  await prisma.paqueteSeguro.createMany({
    skipDuplicates: true,
    data: SEED_PAQUETE_SEGUROS.map((t) => ({
      id: t.id,
      paqueteId: t.paqueteId,
      seguroId: t.seguroId,
      diasCobertura: t.diasCobertura,
      textoDisplay: t.textoDisplay,
      orden: t.orden,
    })),
  });
  console.log(`Ensured ${SEED_PAQUETE_SEGUROS.length} paquete seguros`);

  // ---------------------------------------------------------------------------
  // Seed PaqueteCircuito
  // ---------------------------------------------------------------------------
  await prisma.paqueteCircuito.createMany({
    skipDuplicates: true,
    data: SEED_PAQUETE_CIRCUITOS.map((t) => ({
      id: t.id,
      paqueteId: t.paqueteId,
      circuitoId: t.circuitoId,
      textoDisplay: t.textoDisplay,
      orden: t.orden,
    })),
  });
  console.log(`Ensured ${SEED_PAQUETE_CIRCUITOS.length} paquete circuitos`);

  // ---------------------------------------------------------------------------
  // Seed PaqueteFoto
  // ---------------------------------------------------------------------------
  await prisma.paqueteFoto.createMany({
    skipDuplicates: true,
    data: SEED_PAQUETE_FOTOS.map((t) => ({
      id: t.id,
      paqueteId: t.paqueteId,
      url: t.url,
      alt: t.alt,
      orden: t.orden,
    })),
  });
  console.log(`Ensured ${SEED_PAQUETE_FOTOS.length} paquete fotos`);

  // ---------------------------------------------------------------------------
  // Seed PaqueteEtiqueta
  // ---------------------------------------------------------------------------
  await prisma.paqueteEtiqueta.createMany({
    skipDuplicates: true,
    data: SEED_PAQUETE_ETIQUETAS.map((t) => ({
      id: t.id,
      paqueteId: t.paqueteId,
      etiquetaId: t.etiquetaId,
    })),
  });
  console.log(`Ensured ${SEED_PAQUETE_ETIQUETAS.length} paquete etiquetas`);

  // ---------------------------------------------------------------------------
  // Seed OpcionHotelera
  // ---------------------------------------------------------------------------
  await prisma.opcionHotelera.createMany({
    skipDuplicates: true,
    data: SEED_OPCIONES_HOTELERAS.map((t) => ({
      id: t.id,
      paqueteId: t.paqueteId,
      nombre: t.nombre,
      alojamientoIds: t.alojamientoIds,
      factor: t.factor,
      precioVenta: t.precioVenta,
      orden: t.orden,
    })),
  });
  console.log(`Ensured ${SEED_OPCIONES_HOTELERAS.length} opciones hoteleras`);

  // ---------------------------------------------------------------------------
  // Sync IdCounter with the highest numeric id currently present
  // ---------------------------------------------------------------------------
  const countedEntities = [
    { entity: 'paquete', model: prisma.paquete },
    { entity: 'aereo', model: prisma.aereo },
    { entity: 'alojamiento', model: prisma.alojamiento },
    { entity: 'traslado', model: prisma.traslado },
    { entity: 'seguro', model: prisma.seguro },
    { entity: 'circuito', model: prisma.circuito },
  ] as const;

  for (const { entity, model } of countedEntities) {
    const rows = await (model as any).findMany({ select: { id: true } });
    const maxValue = rows.reduce((max: number, r: { id: string }) => {
      const n = /^\d+$/.test(r.id) ? parseInt(r.id, 10) : 0;
      return n > max ? n : max;
    }, 0);
    await prisma.idCounter.upsert({
      where: { entity },
      create: { entity, lastValue: maxValue },
      update: { lastValue: maxValue },
    });
    console.log(`IdCounter[${entity}] = ${maxValue}`);
  }
}

main()
  .then(async () => {
    console.log('Seed completed successfully!');
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
