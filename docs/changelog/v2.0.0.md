# TravelOz — Changelog

## [2.0.0] — 2026-04-10 — Migracion a Produccion con PostgreSQL

### Resumen
Migracion completa del proyecto de mockup visual puro a aplicacion de produccion con persistencia real en PostgreSQL via Prisma ORM. Implementacion de autenticacion real con NextAuth.js v5 y pipeline de deploy automatico en Railway.

### Agregado

#### Fase 0 — Fundacion
- `prisma/schema.prisma`: Schema completo con 27+ modelos, 4 enums, multi-tenancy (brandId), soft delete, indexes
- `src/lib/db.ts`: Singleton de Prisma client (patron estandar Next.js)
- `prisma/seed.ts`: Script de seed idempotente con skipDuplicates (no-destructivo)
- `prisma/migrations/0001_init/`: Migracion inicial con 535 lineas de SQL
- Dependencias: @prisma/client, prisma, bcryptjs, next-auth@5, tsx

#### Fase 1 — Server Actions (capa API)
- `src/actions/catalog.actions.ts`: 28 funciones CRUD para 7 entidades de catalogo
- `src/actions/service.actions.ts`: 34 funciones CRUD para 5 servicios + sub-entidades
- `src/actions/package.actions.ts`: 28 funciones CRUD para paquetes + 9 junction tables (incluye clonePaquete con $transaction)
- `src/actions/user.actions.ts`: 5 funciones CRUD para usuarios (con hash bcrypt)
- `src/actions/auth.actions.ts`: authenticateUser con bcrypt.compareSync

#### Fase 2 — Migracion de Providers
- `CatalogProvider.tsx`: migrado de seed → server actions con SET_ALL + async CRUD + loading state
- `ServiceProvider.tsx`: migrado (10 state slices, 30 action types)
- `UserProvider.tsx`: migrado con password hashing en createUser
- `useAutoSave.ts`: soporte para onSave async con status 'error'
- `AutoSaveIndicator.tsx`: estado visual de error agregado

#### Fase 3 — PackageProvider
- `PackageProvider.tsx`: migrado (9 state slices, ~30 action types, clone via server $transaction)
- Todas las junction tables (PaqueteAereo, PaqueteAlojamiento, etc.) persisten en DB

#### Fase 4 — Autenticacion Real
- `src/lib/auth.config.ts`: NextAuth v5 con Credentials provider + JWT
- `src/app/api/auth/[...nextauth]/route.ts`: Route handler
- `src/middleware.ts`: Proteccion de rutas server-side
- `AuthProvider.tsx`: reescrito con SessionProvider + useSession de next-auth/react
- Login real con email + password hasheado (bcrypt)
- Usuario admin default: admin@admin.com / 123456

#### Fase 5 — Deploy Pipeline
- Build script: prisma generate → prisma migrate deploy → seed → next build
- Variables Railway configuradas: NEXTAUTH_SECRET, NEXTAUTH_URL
- Deploy automatico en cada push a GitHub
- Migraciones no-destructivas: solo aplica cambios nuevos, nunca borra datos

#### Selector de Alojamientos por OpcionHotelera
- Al crear opcion: checkboxes para seleccionar hoteles especificos
- En opcion existente: panel "Editar alojamientos" para agregar/quitar hoteles
- Boton X para quitar hotel individual (cuando hay 2+)
- Recalculo automatico de precios al cambiar seleccion
- Validacion: minimo 1 hotel por opcion

### Modificado
- `package.json`: +5 dependencias, +4 scripts de DB, prisma seed config, build con migrate deploy
- `src/lib/types.ts`: enums como string literal unions compatibles con Prisma
- `src/app/login/page.tsx`: login via signIn("credentials") de NextAuth
- `src/app/(admin)/layout.tsx`: auth guard como safety net (middleware es primario)
- `src/app/(admin)/circuitos/nuevo/page.tsx`: handler async para createCircuito
- `src/app/(admin)/circuitos/page.tsx`: handler async para clone
- `src/app/(admin)/paquetes/nuevo/page.tsx`: handler async para createPaquete
- `src/app/(admin)/paquetes/[slug]/_components/PreciosTab.tsx`: selector de hoteles por opcion

### Arquitectura
- Patron "Provider-as-Cache": providers mantienen estado local, synced con DB via server actions
- Optimistic updates: dispatch local inmediato despues de server action exitoso
- 0 paginas de admin modificadas (las 21 paginas funcionan sin cambios via hooks existentes)
- Pricing permanece client-side: calcularNetoFijos, calcularVentaOpcion intactos

### Documentacion
- `docs/INFRAESTRUCTURA.md`: auditoria completa de Railway, DB, variables, arquitectura
- `docs/CHANGELOG.md`: este archivo
