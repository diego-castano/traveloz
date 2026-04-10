# TravelOz Admin Panel — Registro de Desarrollo

> Documento actualizado: 2026-04-10 | v2.0 — Produccion con persistencia completa

---

## 1. Resumen Ejecutivo

**TravelOz Admin Panel** es una aplicacion de gestion administrativa para la agencia de viajes uruguaya TravelOz y su marca hermana DestinoIcono. Construida con Next.js 14 (App Router), persistencia en PostgreSQL via Prisma ORM, autenticacion real con NextAuth v5, y un sistema de diseno glassmorphism premium ("Liquid Horizon v3.0").

- **URL de produccion:** [traveloz-production.up.railway.app](https://traveloz-production.up.railway.app)
- **Repositorio:** [github.com/diego-castano/traveloz](https://github.com/diego-castano/traveloz)
- **Cliente:** Geronimo Cassoni & Santiago Rodriguez (co-fundadores TravelOz).
- **Hosting:** Railway (standalone build, auto-deploy on push).

---

## 2. Stack Tecnico

| Tecnologia | Version | Proposito |
|---|---|---|
| Next.js | 14.2.35 | Framework (App Router, Server Actions) |
| TypeScript | 5.8.2 | Type safety |
| Tailwind CSS | 3.4.18 | Utility-first CSS (pinned, NO v4) |
| Prisma | 6.5+ | ORM para PostgreSQL |
| PostgreSQL | — | Base de datos relacional (Railway) |
| NextAuth.js | v5 beta.25 | Autenticacion JWT + Credentials provider |
| bcryptjs | — | Hashing de passwords |
| Motion (Framer Motion) | 12.4.7 | Animaciones y transiciones |
| Radix UI | 1.4.3 | Primitivos accesibles (Dialog, Select, Tabs, Tooltip) |
| Lucide React | 0.469.0 | Iconografia |
| Recharts | 2.15.1 | Graficos para reportes |

---

## 3. Evolucion de la Arquitectura

| Version | Fecha | Descripcion |
|---|---|---|
| v1.0 | Marzo 2026 | Frontend con React Context + datos seed hardcodeados. Sin base de datos. |
| v1.5 | Marzo 2026 | Feedback del cliente incorporado: 34 cambios implementados (opciones hoteleras, factor markup, busqueda, auto-save, etc.) |
| **v2.0** | **Abril 2026** | **Migracion completa a base de datos con persistencia real** |

### Cambios principales en v2.0:
- Prisma schema con 27+ modelos, indexes multi-tenancy, soft delete
- 5 archivos de Server Actions (~80+ funciones async) para todo el CRUD
- 4 providers migrados de datos seed a estado respaldado por Server Actions (patron Provider-as-Cache)
- NextAuth v5 con autenticacion JWT real, hashing de passwords con bcrypt
- Pipeline de migracion no destructiva (`prisma migrate deploy` + seed idempotente en cada build)
- Auto-deploy via Railway en cada `git push`

---

## 4. Estructura del Proyecto

```
src/
├── actions/                    # Server Actions (5 archivos, ~80+ funciones)
│   ├── auth.actions.ts
│   ├── catalog.actions.ts
│   ├── package.actions.ts
│   ├── service.actions.ts
│   └── user.actions.ts
├── app/
│   ├── (admin)/               # 12 modulos admin
│   ├── api/auth/[...nextauth]/ # NextAuth route handler
│   ├── login/
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── layout/                # Sidebar, Topbar, AdminBackground
│   ├── providers/             # 7 providers (Auth, Brand, Catalog, Service, Package, User, Toast)
│   ├── ui/                    # Libreria de componentes UI
│   └── lib/                   # animations, cn, glass
├── hooks/
│   └── useAutoSave.ts
├── lib/
│   ├── auth.ts                # Configuracion de roles, usuarios demo
│   ├── auth.config.ts         # Configuracion NextAuth v5
│   ├── brands.ts              # Tokens por marca (config visual)
│   ├── db.ts                  # Singleton del cliente Prisma
│   ├── types.ts               # Tipos de dominio (enums de Prisma)
│   ├── utils.ts               # Calculos de pricing
│   ├── validation.ts          # Validacion de paquetes
│   └── data/                  # Arrays de datos seed (~2550 lineas)
├── middleware.ts               # Middleware de autenticacion
prisma/
├── schema.prisma              # 27+ modelos
├── seed.ts                    # Script de seed idempotente
└── migrations/                # Historial de migraciones
    ├── 0001_init/migration.sql
    └── migration_lock.toml
```

---

## 5. Modulos Implementados (12 modulos, todos con persistencia en DB)

### 5.1 Dashboard
- 4 stat cards con animacion de conteo (datos reales desde DB)
- Feed de actividad reciente
- Quick links a todos los modulos
- Saludo segun hora del dia

### 5.2 Paquetes (modulo principal)
- **Lista:** Tabla glass, busqueda instantanea, filtros por temporada/estado/tipo, paginacion
- **Detalle — 5 tabs:**
  - **Datos:** Nombre, slug, temporada, tipo, estado, fechas, noches, descripcion
  - **Servicios:** Modal selector con tabs (vuelos, hoteles, traslados, seguros, circuitos)
  - **Precios:** OpcionHotelera con seleccion de hotel por opcion, factor markup independiente, calculo en tiempo real
  - **Fotos:** Upload con grid y reordenamiento
  - **Publicacion:** Toggle publicado/borrador con checklist de validacion
- **Acciones:** Crear, editar, clonar, eliminar (soft delete con confirmacion shake)
- **Auto-save:** Hook `useAutoSave` con debounce

### 5.3 Aereos (Vuelos)
- CRUD completo de rutas aereas
- Tabla de precios por periodo (adulto/menor)
- Dropdown de equipaje (3 opciones)
- Datos: origen, destino, aerolinea, escalas, equipaje, itinerario

### 5.4 Alojamientos
- CRUD completo de hoteles/resorts
- Tabla de precios por periodo y regimen alimenticio
- Gestion de fotos con alt text
- Categoria por estrellas, ciudad, proveedor

### 5.5 Traslados
- Lista con edicion inline de precios
- Tipos: REGULAR y PRIVADO
- Precio fijo por transfer (no por periodo)
- Origen a destino con proveedor

### 5.6 Seguros
- CRUD basado en modales
- Planes con costo diario + monto cobertura
- Proveedor asociado

### 5.7 Circuitos
- CRUD con editor de itinerario dia-por-dia
- Precios por periodo
- Drag-and-drop nativo para reordenar dias

### 5.8 Proveedores
- CRUD con filtro por categoria de servicio (TRASLADOS/SEGUROS/CIRCUITOS)
- Soft delete (campo deletedAt)
- Referenciado por traslados, seguros, circuitos

### 5.9 Catalogos
- 6 sub-catalogos en tabs: Temporadas, Tipos de Paquete, Etiquetas, Paises, Ciudades, Regimenes
- CRUD completo por sub-catalogo
- Datos compartidos entre marcas (filtrados por brandId)

### 5.10 Perfiles
- Gestion de usuarios con asignacion de roles
- Roles: ADMIN, VENDEDOR, MARKETING
- Asignacion de marca

### 5.11 Notificaciones
- Wizard de 4 pasos:
  1. Seleccionar etiqueta de campana
  2. Filtrar paquetes por etiqueta
  3. Seleccionar paquetes a incluir
  4. Preview de email y envio

### 5.12 Reportes
- Stat cards con datos agregados
- Grafico de barras: paquetes por destino (Recharts)
- Tabla: hoteles mas utilizados

---

## 6. Base de Datos

### Infraestructura
- PostgreSQL hospedado en Railway
- 27+ modelos Prisma con enums, indexes, cascade deletes
- Multi-tenancy: `brandId` en todas las entidades

### Migraciones
- `prisma migrate deploy` (no destructivo, se ejecuta en cada build)
- Script de seed con `skipDuplicates: true` (idempotente, se ejecuta en cada build)

### Modelo de Datos (entidad central: Paquete)
```
Paquete
├── → N OpcionHotelera (cada una con hotel + factor + precioVenta)
├── → N Aereo (vuelos asignados)
├── → N Traslado (transfers asignados)
├── → N Seguro (seguros asignados)
├── → N Circuito (circuitos asignados)
├── → N PaqueteFoto (fotos del paquete)
└── → N Etiqueta (tags de campana)
```

### Jerarquias
```
Pais → Ciudad
Proveedor → Traslados, Seguros, Circuitos
Temporada / TipoPaquete → referenciados por Paquete
Regimen → referenciado por PrecioAlojamiento
```

### Credenciales por defecto
- Admin: `admin@admin.com` / `123456`

---

## 7. Modelo de Pricing

El sistema usa un **factor divisor** (no porcentaje):

```
Precio Venta = Neto / Factor
```

### Costos por OpcionHotelera
- **Costos fijos** (compartidos entre opciones): aereos + traslados + seguros + circuitos
- **Costos variables** (por opcion): alojamientos
- Cada OpcionHotelera tiene su propia combinacion de hotel + factor + precioVenta

### Funcion de calculo
```
calcularVentaOpcion(netoFijos, netoAloj, factor) = (netoFijos + netoAloj) / factor
```

- Precios en USD (dolares americanos)
- Factor tipico: 0.60 - 0.70

---

## 8. Gestion de Estado — Patron Provider-as-Cache

Los providers cargan datos desde el servidor via Server Actions y mantienen cache local:

| Provider | Responsabilidad | Fuente de datos |
|---|---|---|
| AuthProvider | Login/logout, sesion, roles, permisos | NextAuth v5 (JWT) |
| BrandProvider | Marca activa, tokens visuales | Estado local |
| CatalogProvider | Temporadas, tipos, regimenes, paises, ciudades, etiquetas | Server Actions → DB |
| ServiceProvider | Vuelos, hoteles, traslados, circuitos, seguros + precios | Server Actions → DB |
| PackageProvider | Paquetes + asignaciones de servicios + opciones hoteleras | Server Actions → DB |
| UserProvider | Gestion de usuarios | Server Actions → DB |
| ToastProvider | Cola de notificaciones toast | Estado local |

### Composicion (Providers.tsx):
```
Auth > Brand > Catalog > Service > Package > User > Toast
```

---

## 9. Autenticacion y Control de Acceso

### Autenticacion
- NextAuth v5 (beta.25) con Credentials provider
- JWT almacenado en cookie segura
- Passwords hasheados con bcryptjs
- Middleware de proteccion de rutas (`middleware.ts`)

### RBAC (Role-Based Access Control)

| Permiso | ADMIN | VENDEDOR | MARKETING |
|---|---|---|---|
| Ver todos los modulos | Si | Solo Paquetes | Paquetes + Reportes |
| Crear/Editar/Eliminar | Si | No | No |
| Ver precio neto | Si | No | No |
| Ver factor markup | Si | No | No |
| Ver precio venta | Si | Si | Si |
| Clonar paquetes | Si | No | No |

---

## 10. Sistema de Diseno — "Liquid Horizon v3.0"

### Marcas

| Propiedad | TravelOz | DestinoIcono |
|---|---|---|
| Color primario | Violet (#6C2BD9) | Teal (#0D9488) |
| Gradiente sidebar | Violet → Purple → Black | Teal → Dark → Black |
| Glow effect | Violet pulse | Teal pulse |
| Login background | Violet mesh gradients | Teal mesh gradients |

### Materiales Glass

| Variante | Background | Blur | Uso |
|---|---|---|---|
| frosted | rgba(255,255,255,0.72) | 20px | Cards, elementos UI |
| frostedSubtle | rgba(255,255,255,0.45) | 12px | Botones secundarios |
| frostedDark | rgba(26,26,46,0.78) | 24px | Sidebar, top nav |
| liquid | rgba(255,255,255,0.55) | 30px | Stat cards, highlights |
| liquidModal | rgba(18,18,38,0.82) | 40px | Modales, dialogos |

### Animaciones (Motion/Framer Motion)

| Preset | Config | Uso |
|---|---|---|
| snappy | stiffness: 500, damping: 30 | Botones, dropdowns |
| gentle | stiffness: 260, damping: 25 | Cards hover, modales |
| bouncy | stiffness: 400, damping: 20 | Toast, checkboxes |
| slow | stiffness: 150, damping: 25 | Pagina entrada |
| micro | stiffness: 600, damping: 35 | Iconos, micro-interacciones |

---

## 11. Features Clave

| Feature | Descripcion |
|---|---|
| Multi-tenancy | `brandId` en todas las entidades, BrandProvider para cambio de marca |
| Auto-save | Hook `useAutoSave` con debounce para guardar cambios automaticamente |
| Busqueda global | Cmd+K abre SearchModal con busqueda en todos los modulos |
| Checklist de validacion | Validacion de requisitos antes de activar un paquete |
| Responsive/mobile | Soporte para dispositivos moviles |
| Soft delete | Paquetes y proveedores usan `deletedAt`, no eliminacion fisica |

---

## 12. Pipeline de Deploy

```
git push → Railway detecta → Nixpacks build:
  1. npm install
  2. prisma generate           (genera tipos del cliente)
  3. prisma migrate deploy     (aplica migraciones nuevas, no destructivo)
  4. tsx prisma/seed.ts        (seed idempotente con skipDuplicates)
  5. next build                (output standalone)
  6. next start -p $PORT
```

---

## 13. Reglas de Negocio Criticas

1. **Multi-marca** — un codebase, dos marcas independientes con datos filtrados por `brandId`
2. **Precios en USD** — todo el sistema opera en dolares americanos
3. **Factor divisor** — Venta = Neto / Factor (no porcentaje sobre neto)
4. **OpcionHotelera independiente** — cada opcion tiene su propia combinacion de hotel + factor + precioVenta
5. **Vendedores solo ven precio venta** — neto y factor son informacion confidencial
6. **Soft delete** — paquetes y proveedores usan `deletedAt`, no eliminacion fisica
7. **Paquetes por temporada** — cada paquete pertenece a una temporada especifica
8. **Servicios reutilizables** — un vuelo/hotel/transfer puede estar en multiples paquetes
9. **Etiquetas = campanas** — las etiquetas agrupan paquetes para notificaciones masivas
10. **Destino derivado** — el destino del paquete se extrae del primer vuelo asignado

---

## 14. Decisiones Tecnicas Clave

| Decision | Razon |
|---|---|
| Tailwind v3.4.18 (no v4) | Incompatibilidad con tokens de diseno glass |
| Server Actions (no API routes) | Simplicidad, type-safety end-to-end, menos boilerplate |
| Provider-as-Cache | Providers cargan desde DB via Server Actions, mantienen cache local para UX fluida |
| NextAuth v5 + Credentials | Control total sobre flujo de login, sin dependencia de OAuth providers |
| Prisma migrate deploy (no dev) | Migraciones no destructivas en produccion, seguras para auto-deploy |
| Seed idempotente (skipDuplicates) | Puede ejecutarse multiples veces sin duplicar datos |
| Standalone build en Railway | Optimiza tamano de imagen y tiempos de cold start |
| Glass materials como inline styles | `backdrop-filter` complejo necesita JS, no solo clases Tailwind |
| Context por entidad (no global) | Evitar re-renders cruzados entre modulos |
| URL-based tab state | Permite browser back/forward correcto |

---

## 15. Limitaciones Actuales

| Limitacion | Estado |
|---|---|
| Envio real de emails | Notificaciones simuladas con toast |
| Upload real de imagenes | URLs de Unsplash como placeholder |
| Tests automatizados | Sin tests E2E ni unitarios |
| Propagacion automatica de precios | Al modificar un servicio, los paquetes no recalculan automaticamente |
| i18n | UI exclusivamente en espanol |

---

## 16. Documentacion del Proyecto

| Archivo | Proposito |
|---|---|
| `docs/flujo.md` | Flujo completo del sistema, reglas de negocio, roles |
| `docs/explicacion.md` | Contexto empresarial, diagnostico operativo |
| `docs/modulos_backend.md` | Especificacion tecnica por modulo |
| `docs/design.json` | Sistema de diseno "Liquid Horizon" completo |
| `docs/DEVELOPMENT.md` | Este documento — registro tecnico del proyecto |

---

*v2.0 — Produccion con persistencia completa — Abril 2026*
