import { PrismaClient } from '@prisma/client';
import { hashSync } from 'bcryptjs';
import {
  SEED_TEMPORADAS,
  SEED_TIPOS_PAQUETE,
  SEED_REGIMENES,
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

async function main() {
  console.log('Seeding database...');

  // Clear all data first (in reverse dependency order)
  await prisma.opcionHotelera.deleteMany();
  await prisma.paqueteEtiqueta.deleteMany();
  await prisma.paqueteFoto.deleteMany();
  await prisma.paqueteCircuito.deleteMany();
  await prisma.paqueteSeguro.deleteMany();
  await prisma.paqueteTraslado.deleteMany();
  await prisma.paqueteAlojamiento.deleteMany();
  await prisma.paqueteAereo.deleteMany();
  await prisma.paquete.deleteMany();
  await prisma.precioCircuito.deleteMany();
  await prisma.circuitoDia.deleteMany();
  await prisma.circuito.deleteMany();
  await prisma.seguro.deleteMany();
  await prisma.traslado.deleteMany();
  await prisma.alojamientoFoto.deleteMany();
  await prisma.precioAlojamiento.deleteMany();
  await prisma.alojamiento.deleteMany();
  await prisma.precioAereo.deleteMany();
  await prisma.aereo.deleteMany();
  await prisma.proveedor.deleteMany();
  await prisma.ciudad.deleteMany();
  await prisma.pais.deleteMany();
  await prisma.regimen.deleteMany();
  await prisma.etiqueta.deleteMany();
  await prisma.tipoPaquete.deleteMany();
  await prisma.temporada.deleteMany();
  await prisma.user.deleteMany();

  // ---------------------------------------------------------------------------
  // Seed Users
  // ---------------------------------------------------------------------------
  const passwordHash = hashSync('admin', 10);
  for (const u of DEMO_USERS) {
    await prisma.user.create({
      data: {
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role as any,
        brandId: u.brandId,
        passwordHash,
      },
    });
  }
  console.log(`Seeded ${DEMO_USERS.length} users`);

  // ---------------------------------------------------------------------------
  // Seed Temporadas
  // ---------------------------------------------------------------------------
  await prisma.temporada.createMany({
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
  console.log(`Seeded ${SEED_TEMPORADAS.length} temporadas`);

  // ---------------------------------------------------------------------------
  // Seed TipoPaquete
  // ---------------------------------------------------------------------------
  await prisma.tipoPaquete.createMany({
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
  console.log(`Seeded ${SEED_TIPOS_PAQUETE.length} tipos de paquete`);

  // ---------------------------------------------------------------------------
  // Seed Etiquetas
  // ---------------------------------------------------------------------------
  await prisma.etiqueta.createMany({
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
  console.log(`Seeded ${SEED_ETIQUETAS.length} etiquetas`);

  // ---------------------------------------------------------------------------
  // Seed Regimenes
  // ---------------------------------------------------------------------------
  await prisma.regimen.createMany({
    data: SEED_REGIMENES.map((t) => ({
      id: t.id,
      brandId: t.brandId,
      nombre: t.nombre,
      abrev: t.abrev,
      createdAt: new Date(t.createdAt),
      updatedAt: new Date(t.updatedAt),
    })),
  });
  console.log(`Seeded ${SEED_REGIMENES.length} regimenes`);

  // ---------------------------------------------------------------------------
  // Seed Paises
  // ---------------------------------------------------------------------------
  await prisma.pais.createMany({
    data: SEED_PAISES.map((t) => ({
      id: t.id,
      brandId: t.brandId,
      nombre: t.nombre,
      codigo: t.codigo,
      createdAt: new Date(t.createdAt),
      updatedAt: new Date(t.updatedAt),
    })),
  });
  console.log(`Seeded ${SEED_PAISES.length} paises`);

  // ---------------------------------------------------------------------------
  // Seed Ciudades
  // ---------------------------------------------------------------------------
  await prisma.ciudad.createMany({
    data: SEED_CIUDADES.map((t) => ({
      id: t.id,
      paisId: t.paisId,
      nombre: t.nombre,
      createdAt: new Date(t.createdAt),
      updatedAt: new Date(t.updatedAt),
    })),
  });
  console.log(`Seeded ${SEED_CIUDADES.length} ciudades`);

  // ---------------------------------------------------------------------------
  // Seed Proveedores
  // ---------------------------------------------------------------------------
  await prisma.proveedor.createMany({
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
  console.log(`Seeded ${SEED_PROVEEDORES.length} proveedores`);

  // ---------------------------------------------------------------------------
  // Seed Aereos
  // ---------------------------------------------------------------------------
  await prisma.aereo.createMany({
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
  console.log(`Seeded ${SEED_AEREOS.length} aereos`);

  // ---------------------------------------------------------------------------
  // Seed PrecioAereo
  // ---------------------------------------------------------------------------
  await prisma.precioAereo.createMany({
    data: SEED_PRECIOS_AEREO.map((t) => ({
      id: t.id,
      aereoId: t.aereoId,
      periodoDesde: t.periodoDesde,
      periodoHasta: t.periodoHasta,
      precioAdulto: t.precioAdulto,
    })),
  });
  console.log(`Seeded ${SEED_PRECIOS_AEREO.length} precios aereo`);

  // ---------------------------------------------------------------------------
  // Seed Alojamientos
  // ---------------------------------------------------------------------------
  await prisma.alojamiento.createMany({
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
  console.log(`Seeded ${SEED_ALOJAMIENTOS.length} alojamientos`);

  // ---------------------------------------------------------------------------
  // Seed PrecioAlojamiento
  // ---------------------------------------------------------------------------
  await prisma.precioAlojamiento.createMany({
    data: SEED_PRECIOS_ALOJAMIENTO.map((t) => ({
      id: t.id,
      alojamientoId: t.alojamientoId,
      periodoDesde: t.periodoDesde,
      periodoHasta: t.periodoHasta,
      precioPorNoche: t.precioPorNoche,
      regimenId: t.regimenId,
    })),
  });
  console.log(`Seeded ${SEED_PRECIOS_ALOJAMIENTO.length} precios alojamiento`);

  // ---------------------------------------------------------------------------
  // Seed AlojamientoFoto
  // ---------------------------------------------------------------------------
  await prisma.alojamientoFoto.createMany({
    data: SEED_ALOJAMIENTO_FOTOS.map((t) => ({
      id: t.id,
      alojamientoId: t.alojamientoId,
      url: t.url,
      alt: t.alt,
      orden: t.orden,
    })),
  });
  console.log(`Seeded ${SEED_ALOJAMIENTO_FOTOS.length} alojamiento fotos`);

  // ---------------------------------------------------------------------------
  // Seed Traslados
  // ---------------------------------------------------------------------------
  await prisma.traslado.createMany({
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
  console.log(`Seeded ${SEED_TRASLADOS.length} traslados`);

  // ---------------------------------------------------------------------------
  // Seed Seguros
  // ---------------------------------------------------------------------------
  await prisma.seguro.createMany({
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
  console.log(`Seeded ${SEED_SEGUROS.length} seguros`);

  // ---------------------------------------------------------------------------
  // Seed Circuitos
  // ---------------------------------------------------------------------------
  await prisma.circuito.createMany({
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
  console.log(`Seeded ${SEED_CIRCUITOS.length} circuitos`);

  // ---------------------------------------------------------------------------
  // Seed CircuitoDia
  // ---------------------------------------------------------------------------
  await prisma.circuitoDia.createMany({
    data: SEED_CIRCUITO_DIAS.map((t) => ({
      id: t.id,
      circuitoId: t.circuitoId,
      numeroDia: t.numeroDia,
      titulo: t.titulo,
      descripcion: t.descripcion,
      orden: t.orden,
    })),
  });
  console.log(`Seeded ${SEED_CIRCUITO_DIAS.length} circuito dias`);

  // ---------------------------------------------------------------------------
  // Seed PrecioCircuito
  // ---------------------------------------------------------------------------
  await prisma.precioCircuito.createMany({
    data: SEED_PRECIOS_CIRCUITO.map((t) => ({
      id: t.id,
      circuitoId: t.circuitoId,
      periodoDesde: t.periodoDesde,
      periodoHasta: t.periodoHasta,
      precio: t.precio,
    })),
  });
  console.log(`Seeded ${SEED_PRECIOS_CIRCUITO.length} precios circuito`);

  // ---------------------------------------------------------------------------
  // Seed Paquetes
  // ---------------------------------------------------------------------------
  await prisma.paquete.createMany({
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
  console.log(`Seeded ${SEED_PAQUETES.length} paquetes`);

  // ---------------------------------------------------------------------------
  // Seed PaqueteAereo
  // ---------------------------------------------------------------------------
  await prisma.paqueteAereo.createMany({
    data: SEED_PAQUETE_AEREOS.map((t) => ({
      id: t.id,
      paqueteId: t.paqueteId,
      aereoId: t.aereoId,
      textoDisplay: t.textoDisplay,
      orden: t.orden,
    })),
  });
  console.log(`Seeded ${SEED_PAQUETE_AEREOS.length} paquete aereos`);

  // ---------------------------------------------------------------------------
  // Seed PaqueteAlojamiento
  // ---------------------------------------------------------------------------
  await prisma.paqueteAlojamiento.createMany({
    data: SEED_PAQUETE_ALOJAMIENTOS.map((t) => ({
      id: t.id,
      paqueteId: t.paqueteId,
      alojamientoId: t.alojamientoId,
      nochesEnEste: t.nochesEnEste,
      textoDisplay: t.textoDisplay,
      orden: t.orden,
    })),
  });
  console.log(`Seeded ${SEED_PAQUETE_ALOJAMIENTOS.length} paquete alojamientos`);

  // ---------------------------------------------------------------------------
  // Seed PaqueteTraslado
  // ---------------------------------------------------------------------------
  await prisma.paqueteTraslado.createMany({
    data: SEED_PAQUETE_TRASLADOS.map((t) => ({
      id: t.id,
      paqueteId: t.paqueteId,
      trasladoId: t.trasladoId,
      textoDisplay: t.textoDisplay,
      orden: t.orden,
    })),
  });
  console.log(`Seeded ${SEED_PAQUETE_TRASLADOS.length} paquete traslados`);

  // ---------------------------------------------------------------------------
  // Seed PaqueteSeguro
  // ---------------------------------------------------------------------------
  await prisma.paqueteSeguro.createMany({
    data: SEED_PAQUETE_SEGUROS.map((t) => ({
      id: t.id,
      paqueteId: t.paqueteId,
      seguroId: t.seguroId,
      diasCobertura: t.diasCobertura,
      textoDisplay: t.textoDisplay,
      orden: t.orden,
    })),
  });
  console.log(`Seeded ${SEED_PAQUETE_SEGUROS.length} paquete seguros`);

  // ---------------------------------------------------------------------------
  // Seed PaqueteCircuito
  // ---------------------------------------------------------------------------
  await prisma.paqueteCircuito.createMany({
    data: SEED_PAQUETE_CIRCUITOS.map((t) => ({
      id: t.id,
      paqueteId: t.paqueteId,
      circuitoId: t.circuitoId,
      textoDisplay: t.textoDisplay,
      orden: t.orden,
    })),
  });
  console.log(`Seeded ${SEED_PAQUETE_CIRCUITOS.length} paquete circuitos`);

  // ---------------------------------------------------------------------------
  // Seed PaqueteFoto
  // ---------------------------------------------------------------------------
  await prisma.paqueteFoto.createMany({
    data: SEED_PAQUETE_FOTOS.map((t) => ({
      id: t.id,
      paqueteId: t.paqueteId,
      url: t.url,
      alt: t.alt,
      orden: t.orden,
    })),
  });
  console.log(`Seeded ${SEED_PAQUETE_FOTOS.length} paquete fotos`);

  // ---------------------------------------------------------------------------
  // Seed PaqueteEtiqueta
  // ---------------------------------------------------------------------------
  await prisma.paqueteEtiqueta.createMany({
    data: SEED_PAQUETE_ETIQUETAS.map((t) => ({
      id: t.id,
      paqueteId: t.paqueteId,
      etiquetaId: t.etiquetaId,
    })),
  });
  console.log(`Seeded ${SEED_PAQUETE_ETIQUETAS.length} paquete etiquetas`);

  // ---------------------------------------------------------------------------
  // Seed OpcionHotelera
  // ---------------------------------------------------------------------------
  await prisma.opcionHotelera.createMany({
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
  console.log(`Seeded ${SEED_OPCIONES_HOTELERAS.length} opciones hoteleras`);
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
