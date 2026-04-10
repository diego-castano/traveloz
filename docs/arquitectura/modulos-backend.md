# TravelOz — Especificación Completa de Módulos del Backend

> **DOCUMENTO PARA CLAUDE CODE** — Este archivo contiene la especificación exhaustiva de cada módulo del backend admin de TravelOz. Léelo completo antes de escribir cualquier línea de código. Cada sección incluye: propósito, schema Prisma, campos con validaciones, relaciones, reglas de negocio, endpoints API, permisos por rol, comportamiento de UI, y edge cases.
>
> **Stack:** Next.js 14 (App Router) + PostgreSQL + Prisma ORM + Tailwind CSS + Framer Motion  
> **Hosting:** Railway (un deploy para ambas marcas)  
> **Moneda base:** USD  
> **Idioma de la UI:** Español

---

## 0. ARQUITECTURA GENERAL

### 0.1 Multi-tenancy por marca

El sistema opera con dos marcas: **TravelOz** y **DestinoIcono**. Ambas comparten la misma aplicación, mismo código, misma base de datos, pero los datos son completamente independientes. Cada entidad tiene un campo `brand_id` que identifica a qué marca pertenece. Un usuario de TravelOz nunca ve datos de DestinoIcono y viceversa.

```prisma
model Brand {
  id        String   @id @default(cuid())
  name      String   // "TravelOz" | "DestinoIcono"
  slug      String   @unique // "traveloz" | "destinoicono"
  domain    String   // "traveloz.com.uy" | URL de DestinoIcono
  logoUrl   String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  users           User[]
  paquetes        Paquete[]
  aereos          Aereo[]
  alojamientos    Alojamiento[]
  traslados       Traslado[]
  seguros         Seguro[]
  circuitos       Circuito[]
  proveedores     Proveedor[]
  temporadas      Temporada[]
  tiposPaquete    TipoPaquete[]
  etiquetas       Etiqueta[]
  paises          Pais[]
  regimenes       Regimen[]
  notificaciones  Notificacion[]
}
```

**Regla crítica:** TODA query a la base de datos DEBE filtrar por `brand_id`. Implementar esto como middleware de Prisma o como wrapper en cada repositorio. Nunca hacer un `findMany()` sin filtro de marca.

### 0.2 Autenticación y sesión

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String   // bcrypt hash
  name      String
  role      Role     @default(VENDEDOR)
  brandId   String
  brand     Brand    @relation(fields: [brandId], references: [id])
  isActive  Boolean  @default(true)
  lastLogin DateTime?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

enum Role {
  ADMIN
  VENDEDOR
  MARKETING
}
```

**Login:** Email + contraseña. JWT en cookie httpOnly. No hay auto-registro — el admin crea los usuarios. Flujo de "olvidé mi contraseña" con email.

**Sesión:** Al hacer login, se determina el `brandId` del usuario y se setea en la sesión. Todas las queries posteriores filtran por ese brandId.

**Permisos por rol:**

| Acción | ADMIN | VENDEDOR | MARKETING |
|--------|-------|----------|-----------|
| Ver paquetes | ✅ | ✅ (solo lectura) | ✅ (solo lectura) |
| Crear/editar/eliminar paquetes | ✅ | ❌ | ❌ |
| Ver precio neto | ✅ | ❌ | ❌ |
| Ver markup | ✅ | ❌ | ❌ |
| Ver precio venta | ✅ | ✅ | ✅ |
| Gestionar servicios (aéreos, hoteles, etc.) | ✅ | ❌ | ❌ |
| Gestionar catálogos | ✅ | ❌ | ❌ |
| Gestionar usuarios | ✅ | ❌ | ❌ |
| Enviar notificaciones | ✅ | ❌ | ❌ |
| Ver reportes | ✅ | ❌ | ✅ |

### 0.3 Soft delete global

Todas las entidades principales usan soft delete. Nunca se borra un registro físicamente. Agregar `deletedAt DateTime?` a cada modelo. Las queries deben filtrar `where: { deletedAt: null }` por defecto.

### 0.4 Auditoría

Cada entidad tiene `createdAt`, `updatedAt`, y opcionalmente `createdBy` / `updatedBy` (referencia a User).

---

## 1. MÓDULO: PAQUETES

### 1.1 Propósito
Entidad central del sistema. Un paquete turístico agrupa servicios (aéreo, alojamiento, traslado, seguro, circuito) y calcula su precio de venta. Es lo que se publica en el frontend público.

### 1.2 Schema Prisma

```prisma
model Paquete {
  id              String    @id @default(cuid())
  brandId         String
  brand           Brand     @relation(fields: [brandId], references: [id])
  
  // --- Datos generales ---
  titulo          String    // Obligatorio. Ej: "Búzios Relax"
  descripcion     String?   @db.Text // Descripción interna
  textoVisual     String?   @db.Text // Lo que se muestra en el frontend como descripción
  noches          Int       // Duración en noches (NO días). Ej: 7
  salidas         String?   // Campo libre. Ej: "Septiembre a noviembre", "Vacaciones de julio"
  
  // --- Clasificación ---
  temporadaId     String?
  temporada       Temporada?  @relation(fields: [temporadaId], references: [id])
  tipoPaqueteId   String?
  tipoPaquete     TipoPaquete? @relation(fields: [tipoPaqueteId], references: [id])
  
  // --- Validez ---
  validezDesde    DateTime?   // Fecha desde que está activo
  validezHasta    DateTime?   // Fecha hasta que se auto-desactiva
  
  // --- Estado ---
  estado          EstadoPaquete @default(BORRADOR)
  destacado       Boolean   @default(false) // Aparece en sección "destacados" del frontend
  
  // --- Precios ---
  netoCalculado   Float     @default(0) // Suma automática de costos de servicios asignados
  markup          Float     @default(0) // Porcentaje de markup. Ej: 35.5
  precioVenta     Float     @default(0) // netoCalculado * (1 + markup/100), editable manualmente
  moneda          String    @default("USD")
  
  // --- Orden visual frontend ---
  ordenServicios  Json?     // Array de IDs de servicios en el orden que se muestran en "incluye"
  
  // --- Relaciones ---
  fotos           PaqueteFoto[]
  etiquetas       PaqueteEtiqueta[]
  aereos          PaqueteAereo[]
  alojamientos    PaqueteAlojamiento[]
  traslados       PaqueteTraslado[]
  seguros         PaqueteSeguro[]
  circuitos       PaqueteCircuito[]
  
  // --- Meta ---
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  deletedAt       DateTime?
  createdBy       String?
}

enum EstadoPaquete {
  BORRADOR
  ACTIVO
  INACTIVO
}

model PaqueteFoto {
  id        String  @id @default(cuid())
  paqueteId String
  paquete   Paquete @relation(fields: [paqueteId], references: [id])
  url       String
  alt       String?
  orden     Int     @default(0) // Para drag-and-drop reorder
}

model PaqueteEtiqueta {
  id          String   @id @default(cuid())
  paqueteId   String
  paquete     Paquete  @relation(fields: [paqueteId], references: [id])
  etiquetaId  String
  etiqueta    Etiqueta @relation(fields: [etiquetaId], references: [id])

  @@unique([paqueteId, etiquetaId])
}
```

### 1.3 Tablas de asignación de servicios a paquetes

```prisma
model PaqueteAereo {
  id              String  @id @default(cuid())
  paqueteId       String
  paquete         Paquete @relation(fields: [paqueteId], references: [id])
  aereoId         String
  aereo           Aereo   @relation(fields: [aereoId], references: [id])
  textoDisplay    String? // Texto visual editable para el frontend. Si es null, se auto-genera desde el aéreo
  orden           Int     @default(0)

  @@unique([paqueteId, aereoId])
}

model PaqueteAlojamiento {
  id              String      @id @default(cuid())
  paqueteId       String
  paquete         Paquete     @relation(fields: [paqueteId], references: [id])
  alojamientoId   String
  alojamiento     Alojamiento @relation(fields: [alojamientoId], references: [id])
  nochesEnEste    Int?        // Noches específicas en este hotel (para multi-destino)
  textoDisplay    String?     // Texto visual editable
  orden           Int         @default(0)

  @@unique([paqueteId, alojamientoId])
}

model PaqueteTraslado {
  id              String   @id @default(cuid())
  paqueteId       String
  paquete         Paquete  @relation(fields: [paqueteId], references: [id])
  trasladoId      String
  traslado        Traslado @relation(fields: [trasladoId], references: [id])
  textoDisplay    String?
  orden           Int      @default(0)

  @@unique([paqueteId, trasladoId])
}

model PaqueteSeguro {
  id              String  @id @default(cuid())
  paqueteId       String
  paquete         Paquete @relation(fields: [paqueteId], references: [id])
  seguroId        String
  seguro          Seguro  @relation(fields: [seguroId], references: [id])
  diasCobertura   Int?    // Si null, se usa paquete.noches
  textoDisplay    String?
  orden           Int     @default(0)

  @@unique([paqueteId, seguroId])
}

model PaqueteCircuito {
  id              String   @id @default(cuid())
  paqueteId       String
  paquete         Paquete  @relation(fields: [paqueteId], references: [id])
  circuitoId      String
  circuito        Circuito @relation(fields: [circuitoId], references: [id])
  textoDisplay    String?
  orden           Int      @default(0)

  @@unique([paqueteId, circuitoId])
}
```

### 1.4 Campos eliminados del sistema legacy

Estos campos existían en EvangelioZ y fueron explícitamente eliminados por el cliente: aerolínea (a nivel paquete), país, ciudad de inicio, ciudad de fin, tasas, menor precio, moneda (como campo editable — siempre USD), campos de texto libre "incluye"/"no incluye"/"vuelos"/"itinerario"/"observaciones" (reemplazados por vinculación real de servicios), latitud, longitud, leyenda, promocional (reemplazado por etiquetas), novedad.

### 1.5 Reglas de negocio

**Cálculo de neto:**
```
netoCalculado = SUM(
  costoAereos(paquete) +
  costoAlojamientos(paquete) +
  costoTraslados(paquete) +
  costoSeguros(paquete) +
  costoCircuitos(paquete)
)
```

Donde:
- `costoAereos` = para cada aéreo asignado, buscar el PrecioAereo cuyo periodo_desde/periodo_hasta cubra las fechas del paquete, tomar precio_adulto.
- `costoAlojamientos` = para cada alojamiento asignado, buscar el PrecioAlojamiento del periodo correspondiente, multiplicar precio_por_noche × nochesEnEste (o paquete.noches si nochesEnEste es null).
- `costoTraslados` = para cada traslado asignado, tomar su precio fijo.
- `costoSeguros` = para cada seguro asignado, tomar costo_por_dia × diasCobertura (o paquete.noches).
- `costoCircuitos` = para cada circuito asignado, buscar el PrecioCircuito del periodo correspondiente.

**Cálculo de precio venta:**
```
precioVenta = netoCalculado * (1 + markup / 100)
```
El precioVenta se auto-calcula pero ES EDITABLE manualmente (para redondear o ajustar estratégicamente). Si el admin sobreescribe precioVenta, el markup se recalcula inversamente.

**Markup editable por paquete:** Cada paquete tiene su propio markup. Santiago explicó que a veces quieren "ir por abajo del markup habitual" en un paquete específico.

**Propagación automática:** Cuando se modifica el precio de un servicio (aéreo, hotel, traslado, seguro, circuito), se debe disparar un recálculo de `netoCalculado` y `precioVenta` en TODOS los paquetes que tengan asignado ese servicio. Implementar esto como un trigger post-update o como una función que se ejecuta al guardar un servicio.

**Auto-desactivación:** Un cron job o webhook (recomendado: cron cada hora) revisa los paquetes con `estado = ACTIVO` y `validezHasta < now()` y los pasa a `estado = INACTIVO`. No se eliminan.

**Clonación:** Al clonar un paquete, se copia todo (datos generales, servicios asignados, etiquetas, fotos) excepto: el ID (nuevo), el estado (pasa a BORRADOR), y las fechas de validez (se vacían para que el admin las defina).

**Texto display de servicios:** Cada servicio asignado al paquete tiene un campo `textoDisplay` opcional. Si es null, el sistema genera automáticamente el texto desde los datos del servicio (ej: "Pasaje aéreo Montevideo / Cancún / Montevideo"). Si el admin lo edita, se usa el texto personalizado. La vinculación interna con la entidad del servicio se mantiene siempre — el textoDisplay es solo cosmético.

### 1.6 API Endpoints

```
GET    /api/paquetes                    → Lista con filtros, paginación, búsqueda
GET    /api/paquetes/:id                → Detalle con servicios expandidos
POST   /api/paquetes                    → Crear (solo ADMIN)
PUT    /api/paquetes/:id                → Actualizar (solo ADMIN)
DELETE /api/paquetes/:id                → Soft delete (solo ADMIN)
POST   /api/paquetes/:id/clone          → Clonar (solo ADMIN)
POST   /api/paquetes/:id/publish        → Cambiar estado a ACTIVO (solo ADMIN)
POST   /api/paquetes/:id/unpublish      → Cambiar estado a INACTIVO (solo ADMIN)
POST   /api/paquetes/:id/servicios      → Asignar servicio (solo ADMIN)
DELETE /api/paquetes/:id/servicios/:sid  → Desasignar servicio (solo ADMIN)
PUT    /api/paquetes/:id/servicios/order → Reordenar servicios (solo ADMIN)
POST   /api/paquetes/:id/fotos          → Subir foto (solo ADMIN)
DELETE /api/paquetes/:id/fotos/:fid     → Eliminar foto (solo ADMIN)
PUT    /api/paquetes/:id/fotos/order    → Reordenar fotos (solo ADMIN)
GET    /api/paquetes/:id/recalcular     → Forzar recálculo de neto y venta (solo ADMIN)
```

**Filtros del listado:**
- `search` (string) → busca en titulo, descripcion, salidas. Búsqueda full-text o ILIKE.
- `estado` (BORRADOR | ACTIVO | INACTIVO)
- `temporadaId` (string)
- `tipoPaqueteId` (string)
- `etiquetaId` (string)
- `destacado` (boolean)
- `page` (int, default 1)
- `limit` (int, default 20)
- `sortBy` (string: titulo | precioVenta | noches | createdAt)
- `sortOrder` (asc | desc)

### 1.7 Comportamiento de UI

**Vista listado (admin):**
- Tabla con columnas: checkbox (selección múltiple), ID, título+destino (2 líneas), temporada (badge), neto, markup%, venta, estado (badge), acciones (editar/clonar/eliminar).
- Toolbar: búsqueda global + filter chips (todos/activo/borrador/inactivo) + botón "Crear paquete".
- Paginación con conteo total.
- Stagger animation al cargar filas.

**Vista listado (vendedor):**
- Misma tabla pero SIN columnas de neto y markup. SIN checkbox. SIN botones de acción. SIN botón crear.
- Solo: ID, título+destino, temporada, precio venta, estado.

**Vista detalle/edición (admin):**
- Tabs: Datos generales | Servicios | Precios | Fotos | Publicación.
- Tab "Datos generales": formulario con todos los campos del paquete.
- Tab "Servicios": lista de servicios asignados con botón "Agregar servicio" que abre modal selector. Cada servicio muestra nombre + precio + textoDisplay editable. Drag-and-drop para reordenar.
- Tab "Precios": componente PriceDisplay (Neto → Markup → Venta) con cálculo en tiempo real.
- Tab "Fotos": grid de fotos con upload drag-and-drop y reorder.
- Tab "Publicación": toggle publicado, fechas validez, estado, destacado, etiquetas.

**Vista detalle (vendedor):**
- Solo lectura. Muestra: título, destino, noches, salidas, servicios incluidos con sus nombres, precio de venta. Sin precios internos.

---

## 2. MÓDULO: AÉREOS

### 2.1 Propósito
Entidades de vuelos reutilizables. Un aéreo (ej: "MVD → CUN → MVD") se crea una vez y se asigna a múltiples paquetes (Cancún, Playa del Carmen, Costa Mujeres, Tulum). Los precios varían por periodo de fechas.

### 2.2 Schema Prisma

```prisma
model Aereo {
  id          String   @id @default(cuid())
  brandId     String
  brand       Brand    @relation(fields: [brandId], references: [id])
  ruta        String   // "MVD → CUN → MVD" — texto libre
  destino     String   // "Cancún" — para filtro rápido en listado
  aerolinea   String?  // No se muestra en listado, solo en edición
  equipaje    String?  // "Carry on", "23kg", etc.
  
  precios     PrecioAereo[]
  paquetes    PaqueteAereo[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?
}

model PrecioAereo {
  id            String   @id @default(cuid())
  aereoId       String
  aereo         Aereo    @relation(fields: [aereoId], references: [id], onDelete: Cascade)
  periodoDesde  DateTime // Inicio del periodo de vigencia
  periodoHasta  DateTime // Fin del periodo de vigencia
  precioAdulto  Float    // Precio neto por adulto
  precioMenor   Float?   // Precio neto por menor (opcional)
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

### 2.3 Reglas de negocio

- Un aéreo puede tener múltiples PrecioAereo con rangos de fecha diferentes (baja sept-oct, alta ene-feb, vacaciones sept 1-7).
- Los periodos NO deben superponerse para el mismo aéreo. Validar en el backend al crear/editar.
- Al asignar un aéreo a un paquete, el sistema busca el PrecioAereo cuyo rango cubra las fechas del paquete (validezDesde) para calcular el costo. Si no hay precio para ese periodo, mostrar warning.
- Cuando se modifica un PrecioAereo, disparar recálculo de neto en todos los paquetes que usen ese aéreo.
- La aerolínea NO aparece en el listado (solo en edición). El destino SÍ aparece.

### 2.4 API Endpoints

```
GET    /api/aereos              → Lista con filtros
GET    /api/aereos/:id          → Detalle con precios
POST   /api/aereos              → Crear (solo ADMIN)
PUT    /api/aereos/:id          → Actualizar datos generales (solo ADMIN)
DELETE /api/aereos/:id          → Soft delete (solo ADMIN)
POST   /api/aereos/:id/clone    → Clonar con todos los precios (solo ADMIN)
POST   /api/aereos/:id/precios  → Agregar precio por periodo (solo ADMIN)
PUT    /api/aereos/:id/precios/:pid → Actualizar precio (solo ADMIN) → DISPARA RECÁLCULO
DELETE /api/aereos/:id/precios/:pid → Eliminar precio (solo ADMIN)
```

### 2.5 UI

**Listado:** Tabla con columnas: ID, ruta, destino, acciones (editar/clonar/eliminar). SIN temporada, SIN aerolínea.

**Edición — todo en una pantalla:**
- Sección superior: ruta, destino, aerolínea, equipaje.
- Sección inferior: tabla de precios por periodo. Cada fila: periodo_desde (datepicker), periodo_hasta (datepicker), precio adulto (input numérico), precio menor (input numérico). Botón "Agregar periodo".

---

## 3. MÓDULO: ALOJAMIENTOS

### 3.1 Propósito
Hoteles reutilizables con precios por periodo y fotos. Se asignan a paquetes. Un paquete puede tener múltiples alojamientos (multi-destino: Río + Búzios).

### 3.2 Schema Prisma

```prisma
model Alojamiento {
  id          String   @id @default(cuid())
  brandId     String
  brand       Brand    @relation(fields: [brandId], references: [id])
  nombre      String   // Nombre del hotel
  ciudadId    String?
  ciudad      Ciudad?  @relation(fields: [ciudadId], references: [id])
  paisId      String?
  pais        Pais?    @relation(fields: [paisId], references: [id])
  categoria   Int?     // Estrellas: 1-5
  sitioWeb    String?
  
  precios     PrecioAlojamiento[]
  fotos       AlojamientoFoto[]
  paquetes    PaqueteAlojamiento[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?
}

model PrecioAlojamiento {
  id              String   @id @default(cuid())
  alojamientoId   String
  alojamiento     Alojamiento @relation(fields: [alojamientoId], references: [id], onDelete: Cascade)
  periodoDesde    DateTime
  periodoHasta    DateTime
  precioPorNoche  Float    // Precio neto por noche
  regimenId       String?
  regimen         Regimen? @relation(fields: [regimenId], references: [id])
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model AlojamientoFoto {
  id            String      @id @default(cuid())
  alojamientoId String
  alojamiento   Alojamiento @relation(fields: [alojamientoId], references: [id])
  url           String
  alt           String?
  orden         Int         @default(0)
}
```

### 3.3 Reglas de negocio

- Misma lógica de precios por periodo que aéreos. Los periodos no se superponen.
- Cada precio incluye el régimen (desayuno, AI, MP) — el mismo hotel puede tener precios diferentes según régimen Y periodo.
- Las fotos del hotel se cargan aquí y se muestran tanto en el admin como en el frontend público.
- Al asignar a un paquete multi-destino (Río + Búzios), se usa `PaqueteAlojamiento.nochesEnEste` para definir cuántas noches en cada hotel.
- Campos eliminados del legacy: latitud, longitud, proveedor (los hoteles no tienen proveedor en el nuevo sistema).
- Propagación: al cambiar un PrecioAlojamiento, recalcular todos los paquetes que usen ese alojamiento.

### 3.4 UI

**Listado:** Tabla con: ID, hotel, ciudad, país, categoría (estrellas como icons), acciones.

**Edición — todo en una pantalla:**
- Datos del hotel: nombre, ciudad (select), país (select), categoría (1-5 estrellas), sitio web.
- Tabla de precios: periodo_desde, periodo_hasta, precio_por_noche, régimen (select). Botón "Agregar periodo".
- Grid de fotos: upload, reorder drag-and-drop, eliminar.

---

## 4. MÓDULO: TRASLADOS

### 4.1 Propósito
Transfers aeropuerto-hotel. Entidad simple con precio fijo (no varía por periodo). Se edita inline en la tabla, sin formulario interno separado.

### 4.2 Schema Prisma

```prisma
model Traslado {
  id           String    @id @default(cuid())
  brandId      String
  brand        Brand     @relation(fields: [brandId], references: [id])
  nombre       String    // "Transfer aeropuerto Galeão ↔ Hotel Copacabana"
  tipo         TipoTraslado @default(REGULAR)
  ciudadId     String?
  ciudad       Ciudad?   @relation(fields: [ciudadId], references: [id])
  paisId       String?
  pais         Pais?     @relation(fields: [paisId], references: [id])
  proveedorId  String?
  proveedor    Proveedor? @relation(fields: [proveedorId], references: [id])
  precio       Float     // Precio neto fijo
  
  paquetes     PaqueteTraslado[]
  
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  deletedAt    DateTime?
}

enum TipoTraslado {
  REGULAR
  PRIVADO
}
```

### 4.3 Reglas de negocio

- Precio fijo, no varía por temporada. Excepciones de fin de año se manejan creando un traslado nuevo.
- Vinculado directamente a Proveedor (N:1). Esta es la relación clave — los proveedores se normalizan para evitar duplicados.
- Sin formulario interno — se edita todo inline en la tabla del listado.
- Propagación: al cambiar precio, recalcular paquetes que usen ese traslado.

### 4.4 UI

**Listado + edición inline:** Tabla con columnas editables: ID (readonly), nombre (input), tipo (select: regular/privado), ciudad (select), país (select), proveedor (select de entidad), precio (input numérico), acciones (clonar/eliminar). El botón "Crear traslado" agrega una fila nueva en la tabla. Guardar es inline, sin modal.

---

## 5. MÓDULO: SEGUROS

### 5.1 Propósito
Planes de asistencia al viajero. Organizados por proveedor → plan → cobertura → costo por día. Son ~4 proveedores y ~100 planes en total.

### 5.2 Schema Prisma

```prisma
model Seguro {
  id           String    @id @default(cuid())
  brandId      String
  brand        Brand     @relation(fields: [brandId], references: [id])
  proveedorId  String?
  proveedor    Proveedor? @relation(fields: [proveedorId], references: [id])
  plan         String    // Nombre del plan
  cobertura    String?   // Campo de texto libre. Ej: "USD 40.000", "USD 300.000"
  costoPorDia  Float     // Costo neto por día por persona
  
  paquetes     PaqueteSeguro[]
  
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  deletedAt    DateTime?
}
```

### 5.3 Reglas de negocio

- El costo en el paquete se calcula como: `costoPorDia × diasCobertura` (o `paquete.noches` si diasCobertura es null).
- Los seguros anuales/multiviaje NO se incluyen en paquetes.
- Los seguros aplican de forma global — el mismo plan se puede usar en cualquier paquete.
- Propagación: al cambiar costoPorDia, recalcular paquetes.
- ~4 proveedores (Universal Assistants, Tarjetas Celeste, Assist Card, CX), ~100 planes total.

### 5.4 UI

**Listado:** Tabla con: proveedor, plan, cobertura, costo/día, acciones.

**Creación:** Formulario simple: proveedor (select), plan (input), cobertura (textarea), costo por día (input numérico).

---

## 6. MÓDULO: CIRCUITOS Y CRUCEROS

### 6.1 Propósito
Itinerarios terrestres o marítimos operados por proveedores (ej: Europa Mundo). Tienen itinerario día por día y precios por periodo. **PENDIENTE: specs completas por definir en próxima llamada con cliente.**

### 6.2 Schema Prisma (preliminar)

```prisma
model Circuito {
  id           String    @id @default(cuid())
  brandId      String
  brand        Brand     @relation(fields: [brandId], references: [id])
  nombre       String    // "Portugal Magnífico"
  noches       Int       // Cantidad de noches del circuito
  proveedorId  String?
  proveedor    Proveedor? @relation(fields: [proveedorId], references: [id])
  
  itinerario   CircuitoDia[]
  precios      PrecioCircuito[]
  paquetes     PaqueteCircuito[]
  
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  deletedAt    DateTime?
}

model CircuitoDia {
  id          String   @id @default(cuid())
  circuitoId  String
  circuito    Circuito @relation(fields: [circuitoId], references: [id], onDelete: Cascade)
  numeroDia   Int      // 1, 2, 3...
  titulo      String   // "Madrid - Barcelona"
  descripcion String?  @db.Text // Detalle del día
  orden       Int      @default(0)
}

model PrecioCircuito {
  id            String   @id @default(cuid())
  circuitoId    String
  circuito      Circuito @relation(fields: [circuitoId], references: [id], onDelete: Cascade)
  periodoDesde  DateTime
  periodoHasta  DateTime
  precio        Float    // Precio neto del circuito completo
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

### 6.3 Reglas de negocio

- Misma lógica de precios por periodo que hoteles y aéreos.
- Al asignar un circuito a un paquete, el itinerario día por día se muestra automáticamente en el frontend como pestaña "Itinerario".
- El itinerario se agrega día por día con título y descripción (copy/paste del proveedor).
- Propagación de precios al modificar.

---

## 7. MÓDULO: PROVEEDORES

### 7.1 Propósito
Entidad normalizada de proveedores de servicios. Se vincula a traslados, seguros, y circuitos. Evita duplicados de nombres.

### 7.2 Schema Prisma

```prisma
model Proveedor {
  id          String   @id @default(cuid())
  brandId     String
  brand       Brand    @relation(fields: [brandId], references: [id])
  nombre      String   // Nombre normalizado
  contacto    String?  // Datos de contacto
  email       String?
  telefono    String?
  notas       String?  @db.Text
  
  traslados   Traslado[]
  seguros     Seguro[]
  circuitos   Circuito[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?
}
```

### 7.3 Reglas

- No se puede eliminar un proveedor que tenga traslados, seguros o circuitos activos vinculados. Mostrar error con la lista de entidades dependientes.
- El nombre debe ser único por marca (unique constraint on [brandId, nombre]).
- NO se vincula directamente a paquetes ni a alojamientos.

### 7.4 UI

CRUD simple con tabla + modal de creación/edición. Columnas: nombre, contacto, email, teléfono, cantidad de servicios vinculados, acciones.

---

## 8. MÓDULO: CATÁLOGOS ADMINISTRABLES

### 8.1 Propósito
Tablas de referencia que el cliente gestiona de forma autónoma. Son selects y filtros que se usan en los otros módulos.

### 8.2 Schemas Prisma

```prisma
model Temporada {
  id        String    @id @default(cuid())
  brandId   String
  brand     Brand     @relation(fields: [brandId], references: [id])
  nombre    String    // "Baja 2026", "Alta 2026"
  orden     Int       @default(0)
  activa    Boolean   @default(true)
  paquetes  Paquete[]
  createdAt DateTime  @default(now())

  @@unique([brandId, nombre])
}

model TipoPaquete {
  id        String    @id @default(cuid())
  brandId   String
  brand     Brand     @relation(fields: [brandId], references: [id])
  nombre    String    // "Lunas de miel", "Salidas grupales", "Cruceros", "Eventos", "Deporte"
  orden     Int       @default(0)
  activo    Boolean   @default(true)
  paquetes  Paquete[]
  createdAt DateTime  @default(now())

  @@unique([brandId, nombre])
}

model Etiqueta {
  id        String    @id @default(cuid())
  brandId   String
  brand     Brand     @relation(fields: [brandId], references: [id])
  nombre    String    // "Brasil", "Black Week", "Nordeste", "Promo Reebok"
  slug      String    // Para URL del frontend: /tag/black-week
  color     String?   // Color hex para badge
  paquetes  PaqueteEtiqueta[]
  createdAt DateTime  @default(now())

  @@unique([brandId, slug])
}

model Pais {
  id            String         @id @default(cuid())
  brandId       String
  brand         Brand          @relation(fields: [brandId], references: [id])
  nombre        String         // "Brasil", "México"
  codigo        String?        // "BR", "MX"
  ciudades      Ciudad[]
  alojamientos  Alojamiento[]
  traslados     Traslado[]
  createdAt     DateTime       @default(now())

  @@unique([brandId, nombre])
}

model Ciudad {
  id            String         @id @default(cuid())
  paisId        String
  pais          Pais           @relation(fields: [paisId], references: [id])
  nombre        String         // "Cancún", "Búzios"
  alojamientos  Alojamiento[]
  traslados     Traslado[]
  createdAt     DateTime       @default(now())
}

model Regimen {
  id        String    @id @default(cuid())
  brandId   String
  brand     Brand     @relation(fields: [brandId], references: [id])
  nombre    String    // "Desayuno", "All Inclusive", "Media Pensión"
  abrev     String?   // "BB", "AI", "MP"
  precios   PrecioAlojamiento[]
  createdAt DateTime  @default(now())

  @@unique([brandId, nombre])
}
```

### 8.3 Reglas

- Todos los catálogos son CRUD simple.
- No se puede eliminar un item de catálogo que esté en uso (ej: no se puede eliminar "Baja 2026" si hay paquetes asignados).
- Las etiquetas generan slugs automáticos para las URLs del frontend.
- Los catálogos son por marca (cada marca tiene sus propias temporadas, etiquetas, etc.).

### 8.4 API

Cada catálogo tiene endpoints idénticos:
```
GET    /api/catalogos/{entidad}          → Lista
POST   /api/catalogos/{entidad}          → Crear
PUT    /api/catalogos/{entidad}/:id      → Actualizar
DELETE /api/catalogos/{entidad}/:id      → Eliminar (con validación de dependencias)
```

Donde `{entidad}` es: temporadas, tipos-paquete, etiquetas, paises, ciudades, regimenes.

### 8.5 UI

Cada catálogo se muestra como una tabla simple dentro de la sección "Catálogos" del sidebar. Tab interno para cada catálogo. Modal de creación/edición. Drag-and-drop para reordenar.

---

## 9. MÓDULO: PERFILES Y ROLES

### 9.1 Propósito
Gestión de usuarios del sistema. El admin crea cuentas con email, contraseña y rol.

### 9.2 Configuración de usuarios inicial

Según lo acordado con el cliente:
- 2 superusuarios (ADMIN): 1 para TravelOz, 1 para DestinoIcono.
- 2 vendedores (VENDEDOR): 1 compartido para vendedores TravelOz, 1 compartido para vendedores DestinoIcono.
- Marketing/reporting: a definir.

Total mínimo: 4 usuarios.

### 9.3 API

```
GET    /api/users           → Lista de usuarios de la marca actual
POST   /api/users           → Crear usuario (solo ADMIN)
PUT    /api/users/:id       → Actualizar (solo ADMIN)
DELETE /api/users/:id       → Desactivar (solo ADMIN, soft delete)
PUT    /api/users/:id/password → Cambiar contraseña
```

### 9.4 Reglas

- No se puede eliminar al último admin de una marca.
- El email es único en toda la base de datos (no por marca).
- El cambio de contraseña requiere la contraseña actual (excepto para reset por admin).

---

## 10. MÓDULO: NOTIFICACIONES A VENDEDORES

### 10.1 Propósito
Enviar emails semanales al equipo de ventas con los paquetes de una campaña, incluyendo resumen de servicios y links directos al frontend.

### 10.2 Schema Prisma

```prisma
model Notificacion {
  id            String   @id @default(cuid())
  brandId       String
  brand         Brand    @relation(fields: [brandId], references: [id])
  etiquetaId    String?  // Etiqueta de campaña seleccionada
  asunto        String
  contenido     String   @db.Text // HTML del email generado/editado
  destinatario  String   // Email del grupo de ventas
  paqueteIds    Json     // Array de IDs de paquetes incluidos
  estado        EstadoNotificacion @default(BORRADOR)
  enviadoAt     DateTime?
  createdBy     String?
  createdAt     DateTime @default(now())
}

enum EstadoNotificacion {
  BORRADOR
  ENVIADO
  ERROR
}
```

### 10.3 Flujo de interacción

1. Admin entra a módulo Notificaciones.
2. Selecciona etiqueta de campaña (dropdown).
3. El sistema filtra y muestra los paquetes ACTIVOS con esa etiqueta.
4. Admin selecciona (checkbox) qué paquetes incluir.
5. Sistema genera automáticamente un template HTML con:
   - Nombre de la campaña/etiqueta.
   - Para cada paquete: título, destino, noches, servicios incluidos (aéreo, hotel, traslado resumidos), precio de venta, link directo a la web.
6. Admin puede editar el template (textarea con preview).
7. Admin envía. El email va a un solo destinatario: `grupo_ventas_traveloz@...` o `grupo_ventas_destinoicono@...`.

### 10.4 API

```
GET    /api/notificaciones                    → Historial de notificaciones enviadas
POST   /api/notificaciones/preview            → Generar preview del template
POST   /api/notificaciones/enviar             → Enviar email
```

---

## 11. MÓDULO: REPORTING / DASHBOARD

### 11.1 Propósito
Reportes y métricas para la toma de decisiones. Accesible por ADMIN y MARKETING.

### 11.2 Dashboard (página de inicio)

Stat cards con métricas clave:
- Total de paquetes activos.
- Total de aéreos cargados.
- Total de alojamientos.
- Visitas web del día (si se integra analytics).

### 11.3 Reportes confirmados

1. **Paquetes por destino × temporada:** Gráfica de torta/barras. Filtrar por país, temporada. Gerónimo quiere: "cuántos paquetes tengo para Brasil en temporada baja, separado por destino".

2. **Hoteles más usados:** Tabla ranking de alojamientos por cantidad de paquetes que los usan.

3. **Proveedores menos utilizados:** Tabla ranking inverso de proveedores por cantidad de servicios.

4. **Visitas web por paquete:** Requiere integración con analytics del frontend. Tabla de paquetes ordenada por visitas.

### 11.4 Reportes futuros (post-launch)

- Comparativas año vs año (necesita +1 año de datos).
- Forecast / tendencias de venta.
- Momento de compra (análisis temporal de cuándo se generan más leads).

### 11.5 API

```
GET /api/reportes/paquetes-por-destino?temporadaId=X
GET /api/reportes/hoteles-mas-usados?limit=20
GET /api/reportes/proveedores-menos-usados?limit=20
GET /api/reportes/stats-dashboard
```

---

## 12. MÓDULO: UPLOAD DE ARCHIVOS

### 12.1 Propósito
Gestión centralizada de subida de imágenes para paquetes y alojamientos.

### 12.2 Implementación

Usar un servicio de storage (recomendado: Supabase Storage o Cloudinary, o directamente en Railway con un volumen). Las imágenes se suben con un endpoint genérico que devuelve la URL.

```
POST /api/upload → recibe FormData con archivo, devuelve { url: string }
```

Formatos aceptados: JPEG, PNG, WebP. Tamaño máximo: 5MB. Generar thumbnail automático para listados.

---

## 13. FUNCIONALIDAD TRANSVERSAL: PROPAGACIÓN DE PRECIOS

### 13.1 Propósito
Cuando se modifica el precio de cualquier servicio, recalcular automáticamente el neto y el precio de venta de todos los paquetes afectados.

### 13.2 Implementación

Crear una función `recalcularPaquete(paqueteId: string)` que:
1. Obtiene el paquete con todos sus servicios asignados.
2. Para cada servicio, obtiene el precio vigente (por periodo o fijo).
3. Suma todos los costos → `netoCalculado`.
4. Aplica markup → `precioVenta = netoCalculado * (1 + markup/100)`.
5. Si el admin había sobreescrito precioVenta manualmente, NO sobreescribir (o marcar un flag `precioManual: true`).
6. Guarda.

Crear una función `propagarCambioServicio(tipoServicio: string, servicioId: string)` que:
1. Busca todos los paquetes que tengan asignado ese servicio.
2. Para cada paquete, ejecuta `recalcularPaquete()`.

Esta función se ejecuta como efecto secundario (post-update hook) cada vez que se modifica:
- `PrecioAereo` (create/update/delete)
- `PrecioAlojamiento` (create/update/delete)
- `Traslado.precio` (update)
- `Seguro.costoPorDia` (update)
- `PrecioCircuito` (create/update/delete)

### 13.3 Consideraciones de performance

Si un aéreo está en 50 paquetes, un cambio de precio dispara 50 recálculos. Esto puede ser:
- **Síncrono** si el volumen es bajo (< 100 paquetes por servicio). TravelOz tiene ~47 paquetes activos.
- **Asíncrono** (queue/background job) si escala. Para el MVP, síncrono es suficiente.

---

## 14. FUNCIONALIDAD TRANSVERSAL: BÚSQUEDA GLOBAL

### 14.1 Implementación

Cada módulo tiene un endpoint de búsqueda que acepta un parámetro `search` y busca con `ILIKE` (PostgreSQL) en los campos relevantes:

- **Paquetes:** titulo, descripcion, salidas.
- **Aéreos:** ruta, destino.
- **Alojamientos:** nombre, ciudad.nombre, pais.nombre.
- **Traslados:** nombre, ciudad.nombre.
- **Seguros:** plan, proveedor.nombre.
- **Proveedores:** nombre, contacto.
- **Etiquetas:** nombre.

Para el MVP, `ILIKE '%query%'` es suficiente. Para futuro, se puede migrar a PostgreSQL full-text search (`tsvector/tsquery`).

---

## 15. FUNCIONALIDAD TRANSVERSAL: AUTO-DESACTIVACIÓN

### 15.1 Implementación

Cron job que corre cada hora (o cada 15 minutos):

```sql
UPDATE paquetes
SET estado = 'INACTIVO', updated_at = NOW()
WHERE estado = 'ACTIVO'
  AND validez_hasta IS NOT NULL
  AND validez_hasta < NOW()
  AND deleted_at IS NULL;
```

Alternativamente, implementar como API endpoint que se llama desde un cron de Railway o Vercel.

---

## 16. SEED DATA INICIAL

Para que el sistema sea usable desde el primer día, el seed debe incluir:

```typescript
// Brands
{ name: "TravelOz", slug: "traveloz", domain: "traveloz.com.uy" }
{ name: "DestinoIcono", slug: "destinoicono", domain: "destinoicono.com" }

// Users (por marca)
{ email: "admin@traveloz.com.uy", role: "ADMIN", name: "Gerónimo Cassoni" }
{ email: "ventas@traveloz.com.uy", role: "VENDEDOR", name: "Equipo Ventas TravelOz" }
{ email: "admin@destinoicono.com", role: "ADMIN", name: "Admin DestinoIcono" }
{ email: "ventas@destinoicono.com", role: "VENDEDOR", name: "Equipo Ventas DestinoIcono" }

// Temporadas (por marca)
"Baja 2026", "Alta 2026", "Baja 2027"

// Tipos de paquete
"Lunas de miel", "Salidas grupales", "Cruceros", "Eventos", "Deporte"

// Regímenes
"Desayuno" (BB), "All Inclusive" (AI), "Media Pensión" (MP), "Solo alojamiento" (SA)

// Países y ciudades (los principales)
Brasil: Búzios, Río de Janeiro, Florianópolis, Salvador de Bahía, Natal, Porto de Galinhas, Maragogi, Fortaleza, Jericoacoara, Arraial do Cabo
México: Cancún, Playa del Carmen, Tulum, Costa Mujeres
Argentina: Buenos Aires, Bariloche, Mendoza, Calafate, Ushuaia, Salta, Jujuy, Tucumán
República Dominicana: Punta Cana
Colombia: Cartagena de Indias
Chile: Santiago de Chile, Valparaíso, Viña del Mar
USA: Miami
Italia: Roma
Turquía: Estambul, Capadocia

// Etiquetas comunes
"Brasil", "Caribe", "Argentina", "Europa", "Black Week", "Promo", "Beach", "Nieve"
```

---

## 17. ESTRUCTURA DE CARPETAS SUGERIDA

```
/app
  /api
    /auth/[...nextauth]/route.ts
    /paquetes/route.ts
    /paquetes/[id]/route.ts
    /paquetes/[id]/clone/route.ts
    /paquetes/[id]/servicios/route.ts
    /paquetes/[id]/fotos/route.ts
    /aereos/route.ts
    /aereos/[id]/route.ts
    /aereos/[id]/precios/route.ts
    /alojamientos/route.ts
    /alojamientos/[id]/route.ts
    /alojamientos/[id]/precios/route.ts
    /alojamientos/[id]/fotos/route.ts
    /traslados/route.ts
    /traslados/[id]/route.ts
    /seguros/route.ts
    /seguros/[id]/route.ts
    /circuitos/route.ts
    /circuitos/[id]/route.ts
    /proveedores/route.ts
    /proveedores/[id]/route.ts
    /catalogos/[entidad]/route.ts
    /users/route.ts
    /notificaciones/route.ts
    /reportes/route.ts
    /upload/route.ts
  /(admin)
    /layout.tsx          → Sidebar + Topbar + BrandProvider
    /page.tsx            → Dashboard
    /paquetes/page.tsx   → Listado
    /paquetes/[id]/page.tsx → Detalle/edición
    /paquetes/nuevo/page.tsx → Crear
    /aereos/page.tsx
    /aereos/[id]/page.tsx
    /alojamientos/page.tsx
    /alojamientos/[id]/page.tsx
    /traslados/page.tsx
    /seguros/page.tsx
    /seguros/[id]/page.tsx
    /circuitos/page.tsx
    /circuitos/[id]/page.tsx
    /proveedores/page.tsx
    /catalogos/page.tsx
    /perfiles/page.tsx
    /notificaciones/page.tsx
    /reportes/page.tsx
  /login/page.tsx
/prisma
  /schema.prisma
  /seed.ts
/lib
  /prisma.ts             → Singleton client
  /auth.ts               → NextAuth config
  /brand-context.ts      → React context para marca activa
  /recalcular.ts         → Lógica de propagación de precios
  /permissions.ts        → Middleware de permisos por rol
/components
  /ui/                   → Componentes base del design system (Button, Input, Select, Table, Modal, Toast, Badge, etc.)
  /layout/               → Sidebar, Topbar, PageHeader
  /modules/              → Componentes específicos por módulo (PaqueteForm, AereoTable, PriceDisplay, etc.)
```

---

## 18. PRIORIDADES DE IMPLEMENTACIÓN

### Fase 1 (MVP — lo que se necesita para lanzar):
1. Auth + multi-marca + roles
2. Catálogos administrables (temporadas, tipos, etiquetas, países, ciudades, regímenes)
3. Proveedores
4. Aéreos con precios por periodo
5. Alojamientos con precios por periodo y fotos
6. Traslados
7. Seguros
8. Paquetes (creación, edición, asignación de servicios, cálculo de precios, publicación)
9. Propagación automática de precios
10. Auto-desactivación por validez
11. Vista vendedor (solo lectura)

### Fase 2 (post-lanzamiento):
12. Notificaciones a vendedores
13. Dashboard con stat cards
14. Reportes básicos
15. Circuitos y cruceros (requiere definición con cliente)

### Fase 3 (futuro):
16. Reportes avanzados (forecast, comparativas, analytics web)
17. Rol Marketing
18. Integraciones externas

---

*Este documento es la fuente de verdad para la implementación del backend. Todo lo descrito aquí proviene de las reuniones con el cliente (25/02 y 05/03 de 2026) y las decisiones de arquitectura tomadas por Latitud Nómade. Si hay ambigüedad, consultar flujo.md y explicacion.md en este mismo proyecto.*
