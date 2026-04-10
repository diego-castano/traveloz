# TravelOz — Infraestructura, Arquitectura y Estado del Proyecto

> Documento actualizado: 2026-04-10 | Proyecto en produccion

---

## 1. Resumen General

**TravelOz Admin Panel** es un panel administrativo para la agencia de viajes TravelOz y su marca hermana DestinoIcono. El proyecto esta **completamente migrado a produccion**: base de datos PostgreSQL conectada e integrada via Prisma ORM, autenticacion real con NextAuth.js v5, y pipeline de deploy automatizado en Railway.

---

## 2. Infraestructura en Railway

### 2.1 Proyecto

| Campo | Valor |
|-------|-------|
| **Plataforma** | Railway |
| **Nombre del proyecto** | Traveloz |
| **Environment** | `production` |
| **URL publica** | `traveloz-production.up.railway.app` |

### 2.2 Servicios desplegados

El proyecto tiene **2 servicios** activos:

| Servicio | Tipo | Estado |
|----------|------|--------|
| **traveloz** | App Next.js (standalone) | SUCCESS (deploy activo) |
| **Postgres** | Base de datos PostgreSQL | SUCCESS (corriendo, conectada y poblada) |

### 2.3 Base de datos PostgreSQL

- **Motor:** PostgreSQL (imagen oficial de Railway)
- **ORM:** Prisma (conectado y operativo)
- **Tablas:** 27+ tablas con datos reales
- **Almacenamiento:** Volumen `postgres-volume` montado en `/var/lib/postgresql/data`
- **Acceso interno:** `postgres.railway.internal:5432` (entre servicios Railway)
- **Acceso externo:** Via proxy TCP publico de Railway (puerto asignado dinamicamente)

### 2.4 Variables de entorno (servicio traveloz)

| Variable | Descripcion |
|----------|-------------|
| `DATABASE_URL` | Connection string interna (comunicacion entre servicios Railway) |
| `DATABASE_PUBLIC_URL` | Connection string publica (acceso externo) |
| `PGHOST` | Host interno de PostgreSQL |
| `PGPORT` | Puerto de PostgreSQL (5432) |
| `PGUSER` | Usuario de la base de datos |
| `PGPASSWORD` | Contrasena de la base de datos (`***`) |
| `PGDATABASE` | Nombre de la base de datos |
| `NEXTAUTH_SECRET` | Clave de firma JWT (`***`) |
| `NEXTAUTH_URL` | `https://traveloz-production.up.railway.app` |
| `RAILWAY_PUBLIC_DOMAIN` | Dominio publico de la app |
| `RAILWAY_PRIVATE_DOMAIN` | Dominio interno de la app |

> **Nota:** Las credenciales reales no se incluyen en este documento por seguridad. Consultar Railway Dashboard o usar `railway variables` para obtenerlas.

### 2.5 Pipeline de build y deploy

```
git push → Railway auto-detects → Nixpacks:
1. npm install
2. npx prisma generate
3. npx prisma migrate deploy (non-destructive)
4. npx tsx prisma/seed.ts (idempotent con skipDuplicates)
5. next build (standalone)
6. next start -p $PORT
```

- **Build output:** `standalone` (optimizado para Railway)
- **Puerto:** `$PORT` (Railway lo asigna automaticamente)
- **Railway config file:** No existe `railway.toml` (usa deteccion automatica Nixpacks)
- **Docker:** No existe Dockerfile (Nixpacks genera el build)

---

## 3. Schema de Base de Datos (27+ modelos)

### 3.1 Enums

| Enum | Valores |
|------|---------|
| `EstadoPaquete` | Estados del ciclo de vida de un paquete |
| `TipoTraslado` | REGULAR, PRIVADO |
| `CategoriaServicio` | Categorias de servicio |
| `Role` | ADMIN, VENDEDOR, MARKETING |

### 3.2 Entidades principales (14)

| Entidad | Descripcion |
|---------|-------------|
| `User` | Usuario del sistema (name, email, hashedPassword, role, brandId) |
| `Paquete` | Paquete de viaje (entidad central) |
| `Aereo` | Ruta de vuelo |
| `Alojamiento` | Hotel/alojamiento |
| `Traslado` | Transfer aeropuerto/ciudad |
| `Seguro` | Seguro de viaje |
| `Circuito` | Circuito guiado multi-dia |
| `Proveedor` | Proveedor de servicios |
| `Temporada` | Temporada de viaje |
| `TipoPaquete` | Clasificacion de paquete |
| `Etiqueta` | Tag/etiqueta para campanas |
| `Pais` | Pais con codigo ISO |
| `Ciudad` | Ciudad dentro de un pais |
| `Regimen` | Regimen alimenticio hotel |

### 3.3 Sub-entidades (8)

| Entidad | Relacion |
|---------|----------|
| `PrecioAereo` | Periodos de precio para vuelos |
| `PrecioAlojamiento` | Periodos de precio para hoteles |
| `PrecioCircuito` | Periodos de precio para circuitos |
| `CircuitoDia` | Itinerario dia a dia de un circuito |
| `AlojamientoFoto` | Fotos de un hotel |
| `PaqueteFoto` | Fotos de un paquete |
| `PaqueteEtiqueta` | Relacion N:N paquete-etiqueta |
| `OpcionHotelera` | Opciones de hotel para un paquete |

### 3.4 Tablas de union (5)

| Tabla | Relacion |
|-------|----------|
| `PaqueteAereo` | Vuelo asignado a un paquete |
| `PaqueteAlojamiento` | Hotel asignado a un paquete |
| `PaqueteTraslado` | Traslado asignado a un paquete |
| `PaqueteSeguro` | Seguro asignado a un paquete |
| `PaqueteCircuito` | Circuito asignado a un paquete |

### 3.5 Indices clave

- `brandId` indexado en todos los modelos con scope de marca (filtra por tenant)

### 3.6 Soft delete

Los siguientes modelos usan soft delete (campo `deletedAt`):
- `Paquete`, `Aereo`, `Alojamiento`, `Traslado`, `Seguro`, `Circuito`, `Proveedor`

### 3.7 Cascade delete

Todas las tablas de union y sub-entidades usan `onDelete: Cascade` sobre la relacion con su entidad padre.

---

## 4. Multi-tenancy

Todas las entidades principales tienen un campo `brandId` que identifica a que marca pertenecen:

| brandId | Marca |
|---------|-------|
| `brand-1` | **TravelOz** |
| `brand-2` | **DestinoIcono** |

- Ambas marcas comparten la misma aplicacion y base de datos
- Todas las queries filtran por `brandId`
- El cambio de marca en la UI dispara un re-fetch de datos

---

## 5. Sistema de Autenticacion

### 5.1 Implementacion

| Aspecto | Detalle |
|---------|---------|
| **Libreria** | NextAuth.js v5 |
| **Provider** | Credentials (email + password) |
| **Estrategia de sesion** | JWT |
| **Hash de passwords** | bcryptjs |
| **Proteccion de rutas** | Middleware en todas las rutas admin |

### 5.2 Usuario admin por defecto

| Campo | Valor |
|-------|-------|
| Email | `admin@admin.com` |
| Password | `***` |

### 5.3 Roles y permisos

| Rol | Descripcion |
|-----|-------------|
| **ADMIN** | Acceso total a todos los modulos, ve precios netos, markup y venta |
| **VENDEDOR** | Solo ve paquetes con precio de venta |
| **MARKETING** | Ve paquetes y reportes con precio de venta |

---

## 6. Server Actions (Capa de API)

El proyecto usa Server Actions de Next.js en lugar de API Routes:

| Archivo | Funciones | Alcance |
|---------|-----------|---------|
| `src/actions/catalog.actions.ts` | 28 funciones | 7 entidades de catalogo (Temporada, TipoPaquete, Etiqueta, Pais, Ciudad, Regimen, Proveedor) |
| `src/actions/service.actions.ts` | 34 funciones | 5 tipos de servicio (Aereo, Alojamiento, Traslado, Seguro, Circuito) + sub-entidades |
| `src/actions/package.actions.ts` | 28 funciones | Paquetes + 9 tipos de junction/sub-entidad |
| `src/actions/user.actions.ts` | 5 funciones | CRUD de usuarios |
| `src/actions/auth.actions.ts` | 1 funcion | Autenticacion (login) |

**Total:** 96 server actions cubriendo todo el CRUD del sistema.

---

## 7. State Management (Provider-as-Cache)

El patron de gestion de estado funciona asi:

1. **Mount:** Los providers hacen fetch desde la DB via server actions en `useEffect`
2. **CRUD:** Se llama al server action primero (persistencia) y luego se hace dispatch al reducer local (actualizacion optimista de UI)
3. **Cambio de marca:** Dispara re-fetch de todos los datos para el nuevo `brandId`
4. **Loading states:** Soportados en todos los providers

### Providers

| Provider | Responsabilidad |
|----------|----------------|
| `AuthProvider` | Sesion de usuario via NextAuth |
| `BrandProvider` | Marca activa (TravelOz / DestinoIcono) |
| `PackageProvider` | Paquetes y relaciones |
| `CatalogProvider` | Catalogos (temporadas, tipos, tags, paises, ciudades, regimenes) |
| `ServiceProvider` | Servicios (aereos, alojamientos, traslados, seguros, circuitos) |
| `UserProvider` | Gestion de usuarios |

---

## 8. Datos Semilla

El seed es idempotente (usa `skipDuplicates`) y se ejecuta automaticamente en cada deploy.

| Entidad | Cantidad |
|---------|----------|
| Paquetes | 16 |
| Aereos | 12 |
| Alojamientos | 14 |
| Traslados | 10 |
| Seguros | 8 |
| Circuitos | 2 |
| Proveedores | 10 |
| Temporadas | 7 |
| Tipos de paquete | 8 |
| Etiquetas | 13 |
| Paises | 12 |
| Ciudades | 31 |
| Regimenes | 10 |
| Opciones hoteleras | 12 |
| Precios aereo | 27 |
| Precios alojamiento | 28 |

Todos los datos usan informacion realista uruguaya: rutas desde MVD, hoteles reales, destinos reales.

---

## 9. Diagrama de Arquitectura (Produccion)

```
Browser → Next.js App (Railway)
  ├── /login → NextAuth Credentials → bcrypt verify → JWT
  ├── /(admin)/* → Middleware auth check
  │   ├── Client Components (providers)
  │   │   ├── useEffect → Server Action (fetch)
  │   │   └── CRUD → Server Action → Prisma → PostgreSQL
  │   └── calcularVenta (client-side pricing)
  └── PostgreSQL (Railway, internal network)
```

```
┌─────────────┐     HTTPS      ┌──────────────────┐     Internal     ┌──────────────┐
│   Browser    │ ◀────────────▸ │  Next.js App     │ ◀──────────────▸ │  PostgreSQL   │
│   (Client)   │                │  (Railway)       │   DATABASE_URL   │  (Railway)    │
└─────────────┘                │                  │                  │              │
                               │  Server Actions  │                  │  27+ tablas  │
                               │  (96 funciones)  │                  │  con datos   │
                               │                  │                  │              │
                               │  Prisma ORM      │                  │  Volumen     │
                               │  (conectado)     │                  │  persistente │
                               └──────────────────┘                  └──────────────┘
                                       │
                                  Railway Network
                              (postgres.railway.internal)
```

---

## 10. Como agregar una nueva migracion

1. Modificar `prisma/schema.prisma`
2. Ejecutar: `npx prisma migrate dev --name descripcion_del_cambio`
3. Commitear el nuevo archivo de migracion en `prisma/migrations/`
4. Push a GitHub → Railway aplica automaticamente en el deploy

---

## 11. Desarrollo local

### Variables de entorno necesarias (`.env.local`)

```env
DATABASE_URL="postgresql://***"          # Obtener de Railway Dashboard
DATABASE_PUBLIC_URL="postgresql://***"   # Obtener de Railway Dashboard
NEXTAUTH_SECRET="***"                    # Obtener de Railway Dashboard
NEXTAUTH_URL="http://localhost:3000"
```

> En Railway, todas las variables estan inyectadas automaticamente. Solo se necesita `.env.local` para desarrollo local.
