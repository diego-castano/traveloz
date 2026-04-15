# Instrucciones de Seed — TravelOz/Destínico Backend

## Contexto
El archivo `seed_data.json` contiene datos reales de operación de Destínico (marca de TravelOz), extraídos y limpiados desde el Excel operativo del equipo comercial. Este JSON debe usarse para poblar la base de datos del backend.

## Contenido del JSON

| Entidad | Cantidad | Descripción |
|---------|----------|-------------|
| `proveedores` | 9 | Operadores turísticos (Sevens, Siur, Planet, etc.) con condiciones, contacto |
| `aerolineas` | 10 | LATAM, GOL, Flybondi, AR, Avianca, Air Europa, Iberia, Copa, JetSMART (dom/intl) |
| `agencias` | 13 | Agencias emisoras con código IATA |
| `plataformas` | 6 | Sistemas de booking (Amadeus, Starlings, Flying, NDC Copa/Latam, APG) |
| `traslados` | 89 | Traslados aeropuerto↔destino con precios 1pax/2pax y operador |
| `paquetes` | 183 | Paquetes completos con servicios, opciones hoteleras, itinerarios |
| `hoteles_catalogo` | 274 | Lista única de todos los hoteles que aparecen en paquetes |

## Estructura de un Paquete

```json
{
  "nombre": "PUNTA CANA",
  "campana": "Outlet de Playas | 2026",     // Etiqueta/temporada
  "servicios": [                              // Costos fijos compartidos
    { "tipo": "VUELO", "neto": 750.0, "observaciones": "740 + 10 FEE" },
    { "tipo": "TRASLADOS", "neto": 14.0, "observaciones": null }
  ],
  "opciones_hoteleras": [                     // Múltiples opciones por paquete
    {
      "hotel": "VIK Hotel Arena Blanca",
      "neto_hotel": 489.0,                    // Costo neto solo del hotel
      "neto_total": 1253.0,                   // servicios.neto + neto_hotel
      "precio_venta": 1299.0,                 // Precio final al público
      "proveedor": "Siur"
    }
    // ... más opciones
  ],
  "itinerario": ["1  LA2399 A 14OCT ..."],    // Líneas de Amadeus (opcional)
  "notas": "7 noches all inclusive",
  "web_id": "2551",                           // ID en el sitio web actual
  "ultima_actualizacion": "2026-04-13"
}
```

## Reglas de negocio importantes

1. **Markup = factor divisor, NO porcentaje**. Precio Venta = Neto Total ÷ Factor. Ejemplo: 1253 ÷ 0.965 ≈ 1299.
2. **Cada opción hotelera tiene su propio markup**. No hay markup único por paquete.
3. **Los servicios (vuelo, traslados, seguros, circuitos) son costos fijos** compartidos entre todas las opciones hoteleras del mismo paquete.
4. **Precios en USD** salvo que se indique lo contrario.
5. **brand_id**: Todos estos datos son de la marca "destinico". El sistema es multi-tenant (destinico + traveloz).

## Cómo usar este archivo

### Paso 1: Leer el JSON
```typescript
import seedData from './seed_data.json';
```

### Paso 2: Limpiar la DB (CUIDADO: borra todo)
```typescript
// Borrar en orden inverso de dependencias
await prisma.opcionHotelera.deleteMany();
await prisma.servicioPaquete.deleteMany(); // o como se llame la relación
await prisma.paquete.deleteMany();
await prisma.traslado.deleteMany();
await prisma.alojamiento.deleteMany();
await prisma.aereo.deleteMany();
await prisma.proveedor.deleteMany();
// etc.
```

### Paso 3: Insertar en orden de dependencias
1. Proveedores
2. Aerolíneas / Agencias / Plataformas
3. Traslados
4. Hoteles (del catálogo)
5. Paquetes con sus servicios y opciones hoteleras

### Notas para el seed
- La `campana` del paquete puede mapearse a etiquetas/temporadas
- El `web_id` puede usarse para vincular con el sitio web existente
- Los `itinerario` son líneas raw de Amadeus — guardar como texto
- Algunos paquetes no tienen hoteles (eventos deportivos, shows, terrestres) — es correcto
- El campo `observaciones` de servicios a veces contiene el desglose del fee ("740 + 10 FEE")
