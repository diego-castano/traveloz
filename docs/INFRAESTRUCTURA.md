# TravelOz — Infraestructura, Arquitectura y Estado del Proyecto

> Documento generado: 2026-04-10 | Auditoria completa del proyecto

---

## 1. Resumen General

**TravelOz Admin Panel** es un panel administrativo para la agencia de viajes TravelOz y su marca hermana DestinoIcono. Actualmente funciona como un prototipo 100% frontend desplegado en Railway, con una base de datos PostgreSQL provisionada pero sin integrar al codigo.

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
| **traveloz** | App Next.js | SUCCESS (deploy activo) |
| **Postgres** | Base de datos PostgreSQL | SUCCESS (corriendo) |

### 2.3 Base de datos PostgreSQL

- **Motor:** PostgreSQL (imagen oficial de Railway)
- **Base de datos:** `railway`
- **Usuario:** `postgres`
- **Almacenamiento:** Volumen persistente montado en `/var/lib/postgresql/data`
- **Acceso interno:** Disponible via `postgres.railway.internal:5432` (entre servicios Railway)
- **Acceso externo:** Disponible via proxy TCP publico de Railway (puerto asignado dinamicamente)
- **Estado actual:** Base de datos **VACIA** — sin tablas, sin schema, sin datos

### 2.4 Variables de entorno

Las siguientes variables de entorno estan **inyectadas automaticamente** por Railway en el servicio de la app (`traveloz`):

| Variable | Descripcion |
|----------|-------------|
| `DATABASE_URL` | Connection string interna (para uso entre servicios Railway) |
| `DATABASE_PUBLIC_URL` | Connection string publica (para acceso externo) |
| `PGHOST` | Host interno de PostgreSQL |
| `PGPORT` | Puerto de PostgreSQL (5432) |
| `PGUSER` | Usuario de la base de datos |
| `PGPASSWORD` | Contrasena de la base de datos |
| `PGDATABASE` | Nombre de la base de datos (`railway`) |
| `POSTGRES_DB` | Nombre de la base de datos |
| `POSTGRES_USER` | Usuario de PostgreSQL |
| `POSTGRES_PASSWORD` | Contrasena de PostgreSQL |
| `RAILWAY_PUBLIC_DOMAIN` | Dominio publico de la app |
| `RAILWAY_PRIVATE_DOMAIN` | Dominio interno de la app |
| `RAILWAY_ENVIRONMENT` | `production` |

> **Nota:** Las credenciales reales no se incluyen en este documento por seguridad. Consultar Railway Dashboard o usar `railway variables` para obtenerlas.

### 2.5 Configuracion de deploy

| Aspecto | Configuracion |
|---------|---------------|
| **Build output** | `standalone` (optimizado para Railway/serverless) |
| **Puerto** | `${PORT:-3000}` (Railway asigna `PORT` automaticamente) |
| **Railway config file** | No existe `railway.toml` (usa deteccion automatica Nixpacks) |
| **Procfile** | No existe (usa `npm start` por defecto) |
| **Docker** | No existe Dockerfile (Nixpacks genera el build) |

---

## 3. Stack Tecnico

| Tecnologia | Version | Proposito |
|------------|---------|-----------|
| Next.js | 14.2.35 | Framework (App Router) |
| React | 18.3.1 | UI Library |
| TypeScript | 5.8.2 | Type safety |
| Tailwind CSS | 3.4.18 | Utility-first CSS |
| Motion (Framer Motion) | 12.4.7 | Animaciones y transiciones |
| Radix UI | 1.4.3 | Primitivos accesibles (Dialog, Select, Tabs, Tooltip) |
| Lucide React | 0.469.0 | Iconografia |
| CVA | 0.7.1 | Variantes de componentes |
| Recharts | 2.15.1 | Graficos para reportes |
| date-fns | 4.1.0 | Formateo de fechas |
| react-day-picker | 9.5.1 | Calendario |
| tailwind-merge | 2.6.0 | Merge de clases Tailwind |
| clsx | 2.1.1 | Utilidad de classnames |

### Paquetes de base de datos instalados: NINGUNO

No hay ORM (Prisma, Drizzle, TypeORM, Sequelize), ni driver de PostgreSQL (`pg`, `postgres`), ni ninguna libreria de base de datos en `package.json`.

---

## 4. Arquitectura del Codigo

### 4.1 Estructura de directorios

```
src/
├── app/
│   ├── layout.tsx                    # Root layout (fuentes, metadata)
│   ├── page.tsx                      # Redirect segun auth → /dashboard o /login
│   ├── login/page.tsx                # Login con demo users
│   └── (admin)/                      # Route group admin (requiere auth)
│       ├── layout.tsx                # Shell: Sidebar + Topbar + Background
│       ├── dashboard/page.tsx        # Dashboard con stats animados
│       ├── paquetes/                 # CRUD paquetes de viaje
│       ├── aereos/                   # CRUD vuelos
│       ├── alojamientos/             # CRUD alojamientos
│       ├── traslados/                # CRUD traslados
│       ├── circuitos/                # CRUD circuitos guiados
│       ├── seguros/                  # CRUD seguros de viaje
│       ├── proveedores/              # CRUD proveedores
│       ├── catalogos/                # CRUD catalogos (temporadas, tipos, etc.)
│       ├── perfiles/                 # Gestion de usuarios
│       ├── notificaciones/           # Centro de notificaciones
│       └── reportes/                 # Reportes y graficos
│
├── components/
│   ├── providers/                    # Context providers (estado en memoria)
│   │   ├── Providers.tsx             # Wrapper que compone todos los providers
│   │   ├── AuthProvider.tsx          # Autenticacion (demo)
│   │   ├── BrandProvider.tsx         # Multi-marca (TravelOz / DestinoIcono)
│   │   ├── PackageProvider.tsx       # Paquetes CRUD via useReducer
│   │   ├── CatalogProvider.tsx       # Catalogos (temporadas, tipos, tags, paises)
│   │   ├── ServiceProvider.tsx       # Servicios (vuelos, hoteles, traslados, etc.)
│   │   └── UserProvider.tsx          # Gestion de usuarios
│   └── ui/                           # Componentes de UI reutilizables
│
├── lib/
│   ├── types.ts                      # 22 interfaces TypeScript del dominio
│   ├── auth.ts                       # Tipos de auth, roles, permisos, demo users
│   └── data/                         # Datos semilla (hardcoded)
│       ├── index.ts                  # Re-exporta todo
│       ├── paquetes.ts               # 16 paquetes de viaje
│       ├── aereos.ts                 # 10 vuelos con periodos de precio
│       ├── alojamientos.ts           # 10 hoteles con fotos y regimenes
│       ├── catalogos.ts              # Temporadas, tipos, tags, paises, ciudades
│       ├── circuitos.ts              # 5 circuitos con itinerarios diarios
│       ├── traslados.ts              # 8 traslados (regulares y privados)
│       ├── seguros.ts                # 4 planes de seguro
│       └── proveedores.ts            # Proveedores de servicios
│
└── hooks/                            # Custom React hooks
```

### 4.2 Flujo de datos actual (sin base de datos)

```
┌─────────────────────────────────────────────────────────┐
│                    BROWSER (Cliente)                      │
│                                                          │
│  ┌──────────────┐    ┌──────────────┐                    │
│  │  Seed Data    │───▸│  React       │                    │
│  │  (TS files)   │    │  Context +   │                    │
│  │  ~2550 lineas │    │  useReducer  │                    │
│  └──────────────┘    └──────┬───────┘                    │
│                             │                            │
│                     ┌───────▼───────┐                    │
│                     │  Components   │                    │
│                     │  (UI Layer)   │                    │
│                     └───────────────┘                    │
│                                                          │
│  ⚠ Sin persistencia: datos se pierden al refrescar       │
└─────────────────────────────────────────────────────────┘

            ┌──────────────────────┐
            │  PostgreSQL Railway   │
            │  (VACIA - sin uso)   │
            │  ❌ Sin conexion      │
            └──────────────────────┘
```

**Problema:** No hay API routes, no hay ORM, no hay conexion a la base de datos. Todo el estado vive en memoria del navegador y se pierde al refrescar la pagina.

---

## 5. Modelo de Datos

### 5.1 Entidades principales (14)

| Entidad | Descripcion | Campos clave |
|---------|-------------|--------------|
| `Paquete` | Paquete de viaje (entidad central) | titulo, destino, noches, markup, precioVenta, estado |
| `Aereo` | Ruta de vuelo | ruta, aerolinea, equipaje, itinerario, escalas |
| `Alojamiento` | Hotel/alojamiento | nombre, ciudadId, paisId, categoria (estrellas) |
| `Traslado` | Transfer aeropuerto/ciudad | nombre, tipo (REGULAR/PRIVADO), precio |
| `Seguro` | Seguro de viaje | plan, cobertura, costoPorDia |
| `Circuito` | Circuito guiado multi-dia | nombre, noches, proveedorId |
| `Proveedor` | Proveedor de servicios | nombre, contacto, email, servicio |
| `Temporada` | Temporada de viaje | nombre, orden, activa |
| `TipoPaquete` | Clasificacion de paquete | nombre, orden, activo |
| `Etiqueta` | Tag/etiqueta para campanas | nombre, slug, color |
| `Pais` | Pais con codigo ISO | nombre, codigo |
| `Ciudad` | Ciudad dentro de un pais | nombre, paisId |
| `Regimen` | Regimen alimenticio hotel | nombre, abrev |
| `User` | Usuario del sistema | name, email, role, brandId |

### 5.2 Sub-entidades y tablas de union (13)

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
| `PaqueteAereo` | Vuelo asignado a un paquete |
| `PaqueteAlojamiento` | Hotel asignado a un paquete |
| `PaqueteTraslado` | Traslado asignado a un paquete |
| `PaqueteSeguro` | Seguro asignado a un paquete |
| `PaqueteCircuito` | Circuito asignado a un paquete |

### 5.3 Multi-tenancy

Todas las entidades principales tienen un campo `brandId` que identifica a que marca pertenecen:
- `brand-1` = **TravelOz**
- `brand-2` = **DestinoIcono**

Ambas marcas comparten la misma aplicacion y base de datos, pero los datos son completamente independientes.

---

## 6. Sistema de Autenticacion

### 6.1 Estado actual (demo)

La autenticacion es simulada. Todos los usuarios usan la misma contrasena de demo. No hay sesiones reales, tokens JWT, ni integracion con servicios de auth.

### 6.2 Roles y permisos

| Rol | Puede editar | Ve precio neto | Ve markup | Ve precio venta | Modulos visibles |
|-----|-------------|----------------|-----------|-----------------|-----------------|
| **ADMIN** | Si | Si | Si | Si | Todos (12 modulos) |
| **VENDEDOR** | No | No | No | Si | Solo paquetes |
| **MARKETING** | No | No | No | Si | Paquetes + Reportes |

### 6.3 Usuarios demo

Se proveen 6 usuarios demo distribuidos entre ambas marcas:
- 2 admins TravelOz
- 1 vendedor TravelOz
- 1 marketing TravelOz
- 1 admin DestinoIcono
- 1 vendedor DestinoIcono

---

## 7. Datos Semilla

Los datos hardcodeados en `/src/lib/data/` incluyen:

| Archivo | Contenido |
|---------|-----------|
| `paquetes.ts` (~723 lineas) | 16 paquetes de viaje con relaciones completas |
| `aereos.ts` (~287 lineas) | 10 vuelos con periodos de precio |
| `alojamientos.ts` (~318 lineas) | 10 hoteles con fotos y regimenes |
| `catalogos.ts` (~534 lineas) | Temporadas, tipos, tags, paises, ciudades, regimenes |
| `circuitos.ts` (~226 lineas) | 5 circuitos con itinerarios diarios y precios |
| `traslados.ts` (~150 lineas) | 8 transfers (regulares y privados) |
| `seguros.ts` (~109 lineas) | 4 planes de seguro |
| `proveedores.ts` (~149 lineas) | Proveedores de servicios |

**Total:** ~2,550 lineas de datos realistas para destinos en Sudamerica.

---

## 8. Configuracion de Next.js

```javascript
// next.config.mjs
{
  output: "standalone",          // Build optimizado para Railway/serverless
  rewrites: [
    "/presentacion_traveloz" → "/presentacion_traveloz/index.html"  // Sitio HTML estatico
  ]
}
```

- **Output standalone:** Genera un build autocontenido (sin necesidad de `node_modules` en produccion)
- **Rewrite:** Sirve un sitio de presentacion estatico en `/presentacion_traveloz`

---

## 9. Lo que falta para integrar la base de datos

### 9.1 Pasos necesarios

1. **Instalar ORM:** Agregar Prisma (o Drizzle) como dependencia
2. **Crear schema:** Definir el schema de base de datos basado en las 27 entidades de `/src/lib/types.ts`
3. **Ejecutar migraciones:** Crear las tablas en el PostgreSQL de Railway
4. **Crear API Routes:** Endpoints en `/src/app/api/` para cada modulo (CRUD)
5. **Seedear datos:** Migrar los datos de `/src/lib/data/` a la base de datos
6. **Migrar providers:** Cambiar los Context providers para que consuman las API Routes en vez de datos en memoria
7. **Autenticacion real:** Implementar auth con JWT o NextAuth

### 9.2 Archivo `.env.local` necesario (desarrollo local)

```env
DATABASE_URL="postgresql://..."   # Obtener de Railway Dashboard
```

> En Railway, `DATABASE_URL` ya esta inyectada automaticamente como variable de entorno. Solo se necesita `.env.local` para desarrollo local.

### 9.3 Referencia de especificacion

El archivo `docs/modulos_backend.md` contiene la especificacion exhaustiva de cada modulo incluyendo:
- Schema Prisma completo
- Validaciones por campo
- Reglas de negocio
- Endpoints API
- Permisos por rol
- Edge cases

---

## 10. Historial de Deploys

| Fecha | Estado | Notas |
|-------|--------|-------|
| 2026-04-10 | SUCCESS | Deploy activo actual |
| 2026-03-31 | FAILED | Deploy fallido (posible error de build) |
| 2026-03-31 | REMOVED | Deploy removido |

---

## 11. Diagrama de Arquitectura Objetivo

```
┌─────────────┐     HTTPS      ┌──────────────────┐     Internal     ┌──────────────┐
│   Browser    │ ◀────────────▸ │  Next.js App     │ ◀──────────────▸ │  PostgreSQL   │
│   (Client)   │                │  (Railway)       │   DATABASE_URL   │  (Railway)    │
└─────────────┘                │                  │                  │              │
                               │  /app/api/*      │                  │  27 tablas   │
                               │  (API Routes)    │                  │  (pendiente) │
                               │                  │                  │              │
                               │  Prisma ORM      │                  │  Volumen     │
                               │  (pendiente)     │                  │  persistente │
                               └──────────────────┘                  └──────────────┘
                                       │
                                  Railway Network
                              (postgres.railway.internal)
```
