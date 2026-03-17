# Phase 3: Data Layer & Types - Research

**Researched:** 2026-03-16
**Domain:** TypeScript entity modeling, in-memory CRUD stores with React Context, seed data generation, utility functions
**Confidence:** HIGH

## Summary

Phase 3 builds the data backbone of the TravelOz admin panel prototype. It creates TypeScript interfaces mirroring the Prisma schemas from `docs/modulos_backend.md`, populates them with realistic Uruguayan travel market data in Spanish, and wraps everything in React Context providers that expose CRUD operations per entity. This phase has zero external dependencies to add -- it relies entirely on TypeScript, React Context, and standard JavaScript APIs already in the stack.

The key architectural decisions are already locked from the roadmap and prior phase research: per-entity Context providers with split state/dispatch to avoid cross-module re-renders, `useMemo` on context values (pattern established in Phase 2's AuthProvider/BrandProvider), and brand-aware data filtering via `activeBrandId`. The existing `AuthProvider` and `BrandProvider` serve as the template for all new providers.

**Primary recommendation:** Build the data layer in three distinct layers -- types first (`src/lib/types.ts`), then seed data (`src/lib/data/`), then context providers (`src/components/providers/`) -- with utility functions (`src/lib/utils.ts`) implemented alongside the types they serve.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DATA-01 | TypeScript interfaces for all domain entities (Paquete, Aereo, Alojamiento, Traslado, Seguro, Circuito, Proveedor, plus catalog entities) | Entity model section provides complete field-by-field interface definitions derived from Prisma schemas in modulos_backend.md. 14 primary entities + 8 junction/sub-entities identified. |
| DATA-02 | Hardcoded seed data with realistic Uruguayan travel market data in Spanish (real destinations, USD pricing, real airline/hotel names) | Seed data section provides realistic values: real airline names (Azul, LATAM, Copa, Aerolineas Argentinas), real hotel names (Copacabana Palace, Iberostar Cancun), real destinations (Buzios, Cancun, Punta Cana), USD pricing ranges based on Uruguayan market. |
| DATA-03 | React Context-based CRUD stores per entity with create/read/update/delete operations and immediate in-memory state updates | Context provider architecture section specifies the exact pattern: split state/dispatch contexts, per-domain grouping (4 providers), useReducer with discriminated union actions, brand filtering in selector hooks. |
| DATA-04 | Utility functions: formatCurrency (USD), calcularNeto (sum service costs), calcularVenta (neto + markup), slugify | Utility functions section provides complete implementations: Intl.NumberFormat for USD, neto calculation formula from modulos_backend.md, venta formula, slugify with Spanish character handling. |
| DATA-05 | Brand-aware data filtering -- context stores filter entities by active brand | Brand filtering pattern section shows how every selector hook accepts brandId and filters, with the existing useBrand() hook providing the active brand ID. |
</phase_requirements>

## Standard Stack

### Core (already installed -- no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | ^5.8.2 | Type definitions for all entities | Already in project, strict mode enabled |
| React | ^18.3.1 | Context API + useReducer for state management | Already in project, established provider pattern |
| Next.js | 14.2.25 | App Router with "use client" providers | Already in project |

### Supporting (already installed)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | ^4.1.0 | Date handling for periodoDesde/periodoHasta fields | Already installed, use for date formatting in seed data |

### No New Dependencies Needed

| Problem | Solution | Why No Library |
|---------|----------|----------------|
| ID generation | `crypto.randomUUID()` | Supported in all modern browsers (since March 2022) and Node.js. Desktop-only admin panel, no legacy browser concern. |
| Currency formatting | `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })` | Native browser API, excellent support, no library needed |
| Slug generation | Custom `slugify()` function | 5 lines of code, not worth a dependency |

## Architecture Patterns

### Recommended File Structure

```
src/
  lib/
    types.ts                    # ALL TypeScript interfaces (single file)
    utils.ts                    # formatCurrency, calcularNeto, calcularVenta, slugify
    data/
      index.ts                  # Re-exports all seed data
      paquetes.ts               # Paquete seed data (15+ items)
      aereos.ts                 # Aereo + PrecioAereo seed data (10+ items)
      alojamientos.ts           # Alojamiento + PrecioAlojamiento seed data (12+ items)
      traslados.ts              # Traslado seed data (8+ items)
      seguros.ts                # Seguro seed data (6+ items)
      circuitos.ts              # Circuito + CircuitoDia seed data (2+ items)
      proveedores.ts            # Proveedor seed data
      catalogos.ts              # Temporada, TipoPaquete, Etiqueta, Pais, Ciudad, Regimen
  components/
    providers/
      AuthProvider.tsx           # EXISTING -- do not modify
      BrandProvider.tsx          # EXISTING -- do not modify
      PackageProvider.tsx        # NEW -- Paquete + assignments (PaqueteAereo, etc.)
      ServiceProvider.tsx        # NEW -- Aereo, Alojamiento, Traslado, Seguro, Circuito
      CatalogProvider.tsx        # NEW -- Temporada, TipoPaquete, Etiqueta, Pais, Ciudad, Regimen, Proveedor
      Providers.tsx              # UPDATE -- add new providers to composition
```

### Pattern 1: Single Types File

**What:** All 22+ TypeScript interfaces live in one `src/lib/types.ts` file.
**When to use:** For a prototype with ~22 entity types that are closely interrelated (Paquete references Aereo, Alojamiento, etc.). Splitting into per-entity type files would create circular import headaches and excessive context switching.
**Why:** The Prisma schema in `modulos_backend.md` defines all entities in one file. Mirroring this makes it easy to cross-reference fields. At ~300 lines, it's well within manageable size.

### Pattern 2: Split Context by Domain (from Architecture Research)

**What:** Three new context providers grouped by domain -- not one per entity (too much boilerplate) and not one monolith (performance problems).
**When to use:** This project, as specified in the architecture research.

**Grouping:**

| Provider | Entities | Rationale |
|----------|----------|-----------|
| `PackageProvider` | Paquete, PaqueteAereo, PaqueteAlojamiento, PaqueteTraslado, PaqueteSeguro, PaqueteCircuito, PaqueteFoto, PaqueteEtiqueta | Central entity with its join tables. Changes to packages should not re-render service lists. |
| `ServiceProvider` | Aereo, PrecioAereo, Alojamiento, PrecioAlojamiento, AlojamientoFoto, Traslado, Seguro, Circuito, CircuitoDia, PrecioCircuito | Independent services that packages reference. Changes to flights shouldn't re-render hotel lists. |
| `CatalogProvider` | Temporada, TipoPaquete, Etiqueta, Pais, Ciudad, Regimen, Proveedor | Reference data that changes rarely. All catalogs grouped since they share the same simple CRUD pattern. |

Note: Auth and Brand are already handled by existing providers from Phase 2.

### Pattern 3: Split State and Dispatch Contexts

**What:** Each domain provider exposes TWO contexts -- one for read-only state, one for dispatch. Components that only dispatch actions (forms) don't re-render when state changes.
**When to use:** Every new provider.
**Source:** React official docs "Scaling Up with Reducer and Context" pattern, confirmed by Kent C. Dodds' article on context optimization.

```typescript
// Pattern: split state/dispatch
const ServiceStateContext = createContext<ServiceState | null>(null);
const ServiceDispatchContext = createContext<Dispatch<ServiceAction> | null>(null);

export function ServiceProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(serviceReducer, initialState);
  // Memoize state to prevent unnecessary re-renders (pattern from AuthProvider)
  const memoizedState = useMemo(() => state, [state]);
  return (
    <ServiceStateContext.Provider value={memoizedState}>
      <ServiceDispatchContext.Provider value={dispatch}>
        {children}
      </ServiceDispatchContext.Provider>
    </ServiceStateContext.Provider>
  );
}
```

### Pattern 4: Discriminated Union Actions with TypeScript

**What:** Use discriminated unions for reducer action types. TypeScript narrows the payload type automatically in each case branch.
**When to use:** Every reducer in every provider.

```typescript
type ServiceAction =
  | { type: 'ADD_AEREO'; payload: Aereo }
  | { type: 'UPDATE_AEREO'; payload: Aereo }
  | { type: 'DELETE_AEREO'; payload: string }  // id
  | { type: 'ADD_ALOJAMIENTO'; payload: Alojamiento }
  // ... etc
```

### Pattern 5: Brand-Filtered Selector Hooks

**What:** Custom hooks that accept brandId and return only matching entities. Consumers call `usePaquetes()` which internally reads brand from `useBrand()`.
**When to use:** Every list/table that displays data.

```typescript
export function usePaquetes(): Paquete[] {
  const { activeBrandId } = useBrand();
  const state = usePackageState();
  return useMemo(
    () => state.paquetes.filter(p => p.brandId === activeBrandId && !p.deletedAt),
    [state.paquetes, activeBrandId]
  );
}
```

### Pattern 6: CRUD Helper Functions in Context

**What:** Export named CRUD functions that wrap dispatch calls, providing a cleaner API than raw dispatch.
**When to use:** For each entity type.

```typescript
export function usePackageActions() {
  const dispatch = usePackageDispatch();
  return useMemo(() => ({
    createPaquete: (data: Omit<Paquete, 'id' | 'createdAt' | 'updatedAt'>) => {
      const paquete: Paquete = {
        ...data,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      dispatch({ type: 'ADD_PAQUETE', payload: paquete });
      return paquete;
    },
    updatePaquete: (paquete: Paquete) =>
      dispatch({ type: 'UPDATE_PAQUETE', payload: { ...paquete, updatedAt: new Date().toISOString() } }),
    deletePaquete: (id: string) =>
      dispatch({ type: 'DELETE_PAQUETE', payload: id }),
    // ... etc
  }), [dispatch]);
}
```

### Anti-Patterns to Avoid

- **Monolithic single context:** Putting all 22 entities in one context means every keystroke in a form re-renders every table in the app. Split into 3 domain contexts.
- **Using `any` type:** The requirement explicitly states "no any types." Use discriminated unions, proper generics, and explicit interface fields.
- **Mutating state in reducers:** Always return new arrays/objects. Use spread syntax or `map/filter` for immutable updates.
- **Storing derived data:** `netoCalculado` and `precioVenta` on Paquete are derived from assigned services. Compute them when service assignments change, not on every render. Store the computed values in the Paquete entity itself (updated by the reducer when services change).
- **Forgetting deletedAt filter:** All queries must filter `!entity.deletedAt` since the domain uses soft deletes. Build this into the selector hooks, not into each component.
- **Creating providers inside other components:** Providers must be defined at the module level. Defining them inside render functions recreates state on every render.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Currency formatting | String concatenation with $ | `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })` | Handles thousands separators, decimal precision, edge cases (negative values, rounding) |
| ID generation | Math.random string hacks | `crypto.randomUUID()` | Native, cryptographically secure, RFC-compliant UUIDs. Available in all modern browsers and Node.js 19+. |
| Date formatting | Manual string manipulation | `date-fns` (already installed) | Already in project deps, handles locale-aware formatting |
| State management | Custom pub/sub or event bus | React Context + useReducer | Official React pattern, well-documented, debuggable with React DevTools |

**Key insight:** This phase is 100% TypeScript + React built-ins. No new libraries are needed. The complexity is in the entity model and realistic seed data, not in tooling.

## Common Pitfalls

### Pitfall 1: Circular Dependencies Between Types
**What goes wrong:** Paquete references Aereo (via PaqueteAereo), and if you put types in separate files, you get circular imports.
**Why it happens:** The entity graph is deeply interconnected -- Paquete references every service type via junction tables.
**How to avoid:** Keep ALL interfaces in a single `types.ts` file. The file will be ~300 lines, which is fine. Do NOT split into per-entity type files.
**Warning signs:** TypeScript errors about types used before declaration, or `undefined` at import time.

### Pitfall 2: Provider Ordering in Composition
**What goes wrong:** PackageProvider needs to read from ServiceProvider and CatalogProvider for price calculations, but they're mounted in the wrong order.
**Why it happens:** React Context only flows downward. A provider can only consume contexts that are mounted ABOVE it in the tree.
**How to avoid:** Mount in this exact order (outermost first): AuthProvider > BrandProvider > CatalogProvider > ServiceProvider > PackageProvider > ToastProvider. This matches the data dependency graph.
**Warning signs:** "useXxx must be used within Provider" errors, or undefined context values.

### Pitfall 3: Seed Data ID Consistency
**What goes wrong:** Seed paquete references `aereoId: "aereo-1"` but the seed aereo has `id: "aero-1"` (typo). Nothing crashes -- the filter just returns empty.
**Why it happens:** Hardcoded string IDs across multiple files with no compile-time checking.
**How to avoid:** Define all seed IDs as constants in a shared file or at the top of each seed file. Use a consistent naming convention: `{entity}-{number}` (e.g., `paquete-1`, `aereo-1`, `hotel-1`, `traslado-1`). Cross-reference explicitly in comments.
**Warning signs:** Tables that render empty despite having seed data loaded.

### Pitfall 4: useMemo Dependencies on Object References
**What goes wrong:** Selector hooks that depend on `state.paquetes` re-run on every render because the state object reference changes even when the array didn't.
**Why it happens:** useReducer returns a new state object every time, even if only one slice changed.
**How to avoid:** Use specific array references in useMemo dependencies (e.g., `state.paquetes` not `state`). The split context pattern helps because each domain's state is a separate object.
**Warning signs:** Performance degradation when typing in forms, sluggish table rendering.

### Pitfall 5: Forgetting Brand Filtering in Seed Data
**What goes wrong:** All seed data shows up regardless of brand because entities don't have `brandId` set.
**Why it happens:** Easy to forget when manually writing 60+ seed objects.
**How to avoid:** Every seed entity MUST include `brandId: "brand-1"` or `brandId: "brand-2"`. Distribute data: ~60% brand-1 (TravelOz), ~40% brand-2 (DestinoIcono). The selector hooks filter by `activeBrandId`, so missing brandId means invisible data.
**Warning signs:** Switching brands in topbar shows exactly the same data.

### Pitfall 6: Dates as Strings vs. Date Objects
**What goes wrong:** Some seed data uses `new Date()`, others use ISO strings. Comparison operators break when mixing types.
**Why it happens:** JSON doesn't support Date objects, Prisma returns strings.
**How to avoid:** Store ALL dates as ISO 8601 strings (`"2026-04-01T00:00:00.000Z"`). This mirrors what a real API would return. Use `date-fns` for display formatting.
**Warning signs:** Price period lookups fail, validez comparisons don't work.

## Entity Model Reference

### Complete Entity List (22 interfaces)

Derived from `docs/modulos_backend.md` Prisma schemas:

**Primary Entities (14):**

| Entity | Fields | brandId | softDelete | Notes |
|--------|--------|---------|------------|-------|
| Paquete | titulo, descripcion, textoVisual, noches, salidas, temporadaId, tipoPaqueteId, validezDesde, validezHasta, estado, destacado, netoCalculado, markup, precioVenta, moneda, ordenServicios | Yes | Yes | Central entity. Estado: BORRADOR/ACTIVO/INACTIVO |
| Aereo | ruta, destino, aerolinea, equipaje | Yes | Yes | Has sub-entity PrecioAereo[] |
| Alojamiento | nombre, ciudadId, paisId, categoria, sitioWeb | Yes | Yes | Has PrecioAlojamiento[] and AlojamientoFoto[] |
| Traslado | nombre, tipo, ciudadId, paisId, proveedorId, precio | Yes | Yes | tipo: REGULAR/PRIVADO. Inline-editable |
| Seguro | proveedorId, plan, cobertura, costoPorDia | Yes | Yes | Cost = costoPorDia x noches |
| Circuito | nombre, noches, proveedorId | Yes | Yes | Has CircuitoDia[] and PrecioCircuito[] |
| Proveedor | nombre, contacto, email, telefono, notas | Yes | Yes | Referenced by Traslado, Seguro, Circuito |
| Temporada | nombre, orden, activa | Yes | No | Label only (e.g., "Baja 2026") |
| TipoPaquete | nombre, orden, activo | Yes | No | e.g., "Lunas de miel" |
| Etiqueta | nombre, slug, color | Yes | No | For campaigns and frontend URLs |
| Pais | nombre, codigo | Yes | No | Has Ciudad[] children |
| Ciudad | paisId, nombre | No (inherits) | No | Belongs to Pais |
| Regimen | nombre, abrev | Yes | No | e.g., "All Inclusive" / "AI" |
| User | (already exists as AuthUser in lib/auth.ts) | Yes | No | Already implemented |

**Junction / Sub-Entities (8):**

| Entity | Parent | Extra Fields | Notes |
|--------|--------|-------------|-------|
| PrecioAereo | Aereo | periodoDesde, periodoHasta, precioAdulto, precioMenor | Multiple per aereo |
| PrecioAlojamiento | Alojamiento | periodoDesde, periodoHasta, precioPorNoche, regimenId | Multiple per hotel |
| PrecioCircuito | Circuito | periodoDesde, periodoHasta, precio | Multiple per circuit |
| CircuitoDia | Circuito | numeroDia, titulo, descripcion, orden | Ordered itinerary |
| AlojamientoFoto | Alojamiento | url, alt, orden | Photo gallery |
| PaqueteFoto | Paquete | url, alt, orden | Photo gallery |
| PaqueteEtiqueta | Paquete | etiquetaId | Many-to-many join |
| PaqueteServicio (5 types) | Paquete | aereoId/alojamientoId/etc, textoDisplay, orden | PaqueteAereo, PaqueteAlojamiento, PaqueteTraslado, PaqueteSeguro, PaqueteCircuito |

### Key Enums

```typescript
type EstadoPaquete = 'BORRADOR' | 'ACTIVO' | 'INACTIVO';
type TipoTraslado = 'REGULAR' | 'PRIVADO';
type Role = 'ADMIN' | 'VENDEDOR' | 'MARKETING'; // Already exists
```

### Entity Relationship Summary

```
Paquete ─┬─> PaqueteAereo ───────> Aereo ───> PrecioAereo[]
         ├─> PaqueteAlojamiento ──> Alojamiento ─┬─> PrecioAlojamiento[]
         │                                       └─> AlojamientoFoto[]
         ├─> PaqueteTraslado ─────> Traslado ───> Proveedor
         ├─> PaqueteSeguro ───────> Seguro ─────> Proveedor
         ├─> PaqueteCircuito ─────> Circuito ─┬─> CircuitoDia[]
         │                                    ├─> PrecioCircuito[]
         │                                    └─> Proveedor
         ├─> PaqueteFoto[]
         ├─> PaqueteEtiqueta[] ───> Etiqueta
         ├─> Temporada
         └─> TipoPaquete

Pais ───> Ciudad[]
Ciudad ──> Alojamiento, Traslado (reverse lookup)
Regimen ──> PrecioAlojamiento (reverse lookup)
```

## Seed Data Specification

### Realistic Uruguayan Travel Market Data

All data must be in Spanish with real-world references from the Uruguayan travel market.

**Brands (2 -- already exist in brands.ts):**
- brand-1: TravelOz (traveloz.com.uy)
- brand-2: DestinoIcono

**Users (5 -- already exist in auth.ts):**
- Already defined as DEMO_USERS. No changes needed.

**Temporadas (seed: 4):**
- Baja 2026, Alta 2026, Baja 2027, Vacaciones Julio 2026

**Tipos de Paquete (seed: 5):**
- Lunas de miel, Salidas grupales, Cruceros, Eventos, Deporte

**Regimenes (seed: 5):**
- Desayuno (BB), All Inclusive (AI), Media Pension (MP), Solo Alojamiento (SA), Pension Completa (PC)

**Paises (seed: 6) with Ciudades:**
- Brasil: Buzios, Rio de Janeiro, Florianopolis, Salvador de Bahia, Maceio
- Mexico: Cancun, Playa del Carmen, Los Cabos, Puerto Vallarta
- Republica Dominicana: Punta Cana, Santo Domingo
- Argentina: Buenos Aires, Bariloche, Mendoza
- Estados Unidos: Miami, Orlando, Nueva York
- Espana: Madrid, Barcelona

**Etiquetas (seed: 8):**
- Brasil, Caribe, Europa, Black Week, Promo Nordeste, Lunas de Miel, Vacaciones Julio, Escapadas

**Proveedores (seed: 6):**
- Universal Assistants (seguros), Assist Card (seguros), Tarjetas Celeste (seguros), Sevens (traslados), BRT (traslados), Europa Mundo (circuitos)

**Aereos (seed: 10+) with PrecioAereo:**
- MVD -> GIG -> MVD (Rio de Janeiro) -- Azul, LATAM
- MVD -> CUN -> MVD (Cancun) -- Copa Airlines
- MVD -> PUJ -> MVD (Punta Cana) -- Aerolineas Argentinas
- MVD -> MIA -> MVD (Miami) -- American Airlines
- MVD -> FLN -> MVD (Florianopolis) -- Azul
- MVD -> SSA -> MVD (Salvador) -- LATAM
- MVD -> EZE -> MVD (Buenos Aires) -- Buquebus + aereo
- MVD -> MAD -> MVD (Madrid) -- Iberia
- MVD -> MCO -> MVD (Orlando) -- Copa Airlines
- MVD -> SJO -> MVD (Costa Rica) -- Copa Airlines
- Each with 2-3 PrecioAereo rows (temporada baja/alta/vacaciones)
- Price range: USD 350-1200 per adult

**Alojamientos (seed: 12+) with PrecioAlojamiento and fotos:**
- Buzios: Casas Brancas Hotel, Insolia Buzios
- Cancun: Iberostar Cancun, Grand Oasis Cancun, Hyatt Ziva Cancun
- Punta Cana: Barcelo Bavaro Palace, Hard Rock Punta Cana
- Rio: Copacabana Palace, Windsor Atlantica
- Miami: Fontainebleau Miami Beach, Hilton Miami Downtown
- Madrid: VP Plaza Espana Design, Hotel Catalonia Gran Via
- Each with 2+ PrecioAlojamiento rows and 2+ placeholder photo URLs
- Price range: USD 80-350 per night

**Traslados (seed: 8+):**
- Transfer aeropuerto Galeao <-> Zona Sur (Rio, regular, USD 35)
- Transfer aeropuerto Cancun <-> Zona Hotelera (Cancun, regular, USD 25)
- Transfer privado aeropuerto Cancun (Cancun, privado, USD 85)
- Transfer aeropuerto Punta Cana <-> Hotel (Punta Cana, regular, USD 30)
- Transfer aeropuerto Miami <-> South Beach (Miami, regular, USD 40)
- Transfer aeropuerto Barajas <-> Centro (Madrid, regular, USD 35)
- Transfer privado Barajas <-> Centro (Madrid, privado, USD 90)
- Transfer aeropuerto Ezeiza <-> Centro (Buenos Aires, regular, USD 20)

**Seguros (seed: 6+):**
- Universal Assistants: Plan Basico (USD 40.000, USD 8/dia), Plan Premium (USD 80.000, USD 14/dia)
- Assist Card: Plan AC 60 (USD 60.000, USD 10/dia), Plan AC 150 (USD 150.000, USD 18/dia)
- Tarjetas Celeste: Plan Celeste (USD 40.000, USD 7/dia)
- CX: Plan CX Max (USD 300.000, USD 22/dia)

**Circuitos (seed: 2+) with CircuitoDia and PrecioCircuito:**
- Portugal Magnifico (Europa Mundo, 8 noches, ~8 dias)
- Turquia Clasica (Europa Mundo, 10 noches, ~11 dias)
- Each with full day-by-day itinerary and 2 price periods

**Paquetes (seed: 15+) with assigned services:**
- Distribute: ~9-10 for brand-1 (TravelOz), ~5-6 for brand-2 (DestinoIcono)
- Mix of estados: ~8 ACTIVO, ~4 BORRADOR, ~3 INACTIVO
- Examples:
  - "Buzios Relax" (7 noches, Brasil, Baja 2026, aero+hotel+traslado+seguro)
  - "Cancun All Inclusive" (7 noches, Caribe, Alta 2026, aero+hotel AI+traslado+seguro)
  - "Punta Cana Paradise" (7 noches, Caribe, Baja 2026)
  - "Miami Shopping" (5 noches, USA, Alta 2026)
  - "Portugal Magnifico" (8 noches, Europa, Alta 2026, aero+circuito+seguro)
  - "Rio + Buzios Clasico" (10 noches, Brasil, multi-destino, 2 hoteles)
  - "Escapada Buenos Aires" (4 noches, Argentina, Baja 2026)
  - "Orlando Magic" (7 noches, USA, Vacaciones Julio)
  - etc.
- Each with 2-4 assigned services, markup 25-40%, realistic neto/venta calculations

### Photo URLs

For the prototype, use Unsplash placeholder URLs:
```
https://images.unsplash.com/photo-{id}?w=800&h=600&fit=crop
```
Use real Unsplash IDs for travel destinations (beaches, hotels, cities). This is explicitly called out as acceptable in REQUIREMENTS.md ("Use Unsplash placeholder URLs").

## Utility Functions Specification

### formatCurrency(amount: number): string

```typescript
// Use Intl.NumberFormat for proper USD formatting
const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatCurrency(amount: number): string {
  return usdFormatter.format(Math.round(amount));
}
// formatCurrency(1234.5) => "$1,235"
// formatCurrency(0) => "$0"
```

Note: The existing `PriceDisplay.tsx` has a local `formatUSD` function that does the same thing with `toLocaleString`. The new `formatCurrency` in `utils.ts` should be the canonical version, and `PriceDisplay.tsx` should import it (update in a later phase or as part of this phase).

### calcularNeto(paquete, services): number

```typescript
// From modulos_backend.md section 1.5:
// netoCalculado = SUM(costoAereos + costoAlojamientos + costoTraslados + costoSeguros + costoCircuitos)
export function calcularNeto(
  paquete: Paquete,
  assignedAereos: { aereo: Aereo; precioAereo?: PrecioAereo }[],
  assignedAlojamientos: { alojamiento: Alojamiento; precioAlojamiento?: PrecioAlojamiento; nochesEnEste?: number }[],
  assignedTraslados: Traslado[],
  assignedSeguros: { seguro: Seguro; diasCobertura?: number }[],
  assignedCircuitos: { circuito: Circuito; precioCircuito?: PrecioCircuito }[],
): number {
  let neto = 0;
  // Aereos: sum precioAdulto for each assigned
  neto += assignedAereos.reduce((sum, a) => sum + (a.precioAereo?.precioAdulto ?? 0), 0);
  // Alojamientos: precioPorNoche * noches
  neto += assignedAlojamientos.reduce((sum, a) => {
    const noches = a.nochesEnEste ?? paquete.noches;
    return sum + (a.precioAlojamiento?.precioPorNoche ?? 0) * noches;
  }, 0);
  // Traslados: precio fijo
  neto += assignedTraslados.reduce((sum, t) => sum + t.precio, 0);
  // Seguros: costoPorDia * dias
  neto += assignedSeguros.reduce((sum, s) => {
    const dias = s.diasCobertura ?? paquete.noches;
    return sum + s.seguro.costoPorDia * dias;
  }, 0);
  // Circuitos: precio del periodo
  neto += assignedCircuitos.reduce((sum, c) => sum + (c.precioCircuito?.precio ?? 0), 0);
  return neto;
}
```

### calcularVenta(neto: number, markup: number): number

```typescript
// From modulos_backend.md: precioVenta = netoCalculado * (1 + markup/100)
export function calcularVenta(neto: number, markup: number): number {
  return Math.round(neto * (1 + markup / 100));
}
// calcularVenta(1000, 35) => 1350
```

### slugify(text: string): string

```typescript
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')                    // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, '')     // Remove diacritical marks
    .replace(/[^a-z0-9]+/g, '-')         // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, '');            // Trim leading/trailing hyphens
}
// slugify("Black Friday 2026") => "black-friday-2026"
// slugify("Lunas de Miel") => "lunas-de-miel"
// slugify("Promo Nordeste Marzo") => "promo-nordeste-marzo"
```

## Context Provider Architecture

### Provider Composition Order (updated Providers.tsx)

```typescript
// The exact nesting order, respecting data dependencies:
<AuthProvider>         {/* Session + role */}
  <BrandProvider>      {/* Active brand selection */}
    <CatalogProvider>  {/* Reference data: temporadas, tipos, etiquetas, paises, regimenes, proveedores */}
      <ServiceProvider>{/* Services: aereos, alojamientos, traslados, seguros, circuitos */}
        <PackageProvider>{/* Packages + service assignments */}
          <ToastProvider>
            {children}
          </ToastProvider>
        </PackageProvider>
      </ServiceProvider>
    </CatalogProvider>
  </BrandProvider>
</AuthProvider>
```

### Hooks Exported Per Provider

**CatalogProvider:**
- `useCatalogState()` -- raw state
- `useCatalogDispatch()` -- dispatch function
- `useTemporadas()` -- brand-filtered
- `useTiposPaquete()` -- brand-filtered
- `useEtiquetas()` -- brand-filtered
- `usePaises()` -- brand-filtered (includes nested ciudades)
- `useRegimenes()` -- brand-filtered
- `useProveedores()` -- brand-filtered
- `useCatalogActions()` -- CRUD functions for all catalog entities

**ServiceProvider:**
- `useServiceState()` -- raw state
- `useServiceDispatch()` -- dispatch function
- `useAereos()` -- brand-filtered
- `useAlojamientos()` -- brand-filtered
- `useTraslados()` -- brand-filtered
- `useSeguros()` -- brand-filtered
- `useCircuitos()` -- brand-filtered
- `useServiceActions()` -- CRUD functions for all service entities

**PackageProvider:**
- `usePackageState()` -- raw state
- `usePackageDispatch()` -- dispatch function
- `usePaquetes()` -- brand-filtered, with deletedAt filter
- `usePaqueteById(id: string)` -- single package lookup
- `usePackageActions()` -- CRUD + clone + assign/remove services

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `framer-motion` import | `motion` import (rebranded) | motion v12 (late 2024) | Use `import { motion } from "motion/react"` -- already done in project |
| Individual @radix-ui/* packages | Unified `radix-ui` package | radix-ui v1.4 (2024) | Single install -- already done |
| uuid library for IDs | `crypto.randomUUID()` | Browser support since March 2022 | No dependency needed |
| `React.FC<Props>` | Plain function with props type | Community consensus 2023+ | `function Component(props: Props)` -- matches existing codebase pattern |
| Props spreading on context value | `useMemo` wrapping value | React team recommendation | Already used in AuthProvider/BrandProvider |

## Open Questions

1. **PriceDisplay formatUSD duplication**
   - What we know: `PriceDisplay.tsx` has a local `formatUSD()` function. Phase 3 creates a canonical `formatCurrency()` in `utils.ts`.
   - What's unclear: Should we update PriceDisplay to import from utils.ts now, or defer?
   - Recommendation: Update PriceDisplay as part of this phase since it's a 1-line change and eliminates duplication. The component stays in `ui/` but imports from `lib/utils.ts`.

2. **Seed data photos: Unsplash URL format**
   - What we know: Requirements say "Use Unsplash placeholder URLs." Photos need to render as real images.
   - What's unclear: Whether to use Unsplash Source API (`source.unsplash.com`) or direct image URLs.
   - Recommendation: Use direct Unsplash image URLs with `?w=800&h=600&fit=crop` parameters. The Source API was deprecated in 2024. Use real Unsplash photo IDs for travel-relevant imagery.

3. **Ciudad as brandId-less entity**
   - What we know: In the Prisma schema, Ciudad belongs to Pais (which has brandId), but Ciudad itself does not have brandId.
   - What's unclear: Should filtering be done at the Pais level (and inherit to ciudades), or should Ciudad also carry brandId?
   - Recommendation: Ciudad inherits brand scope through its parent Pais. The selector hook `usePaises()` returns brand-filtered Pais objects with their Ciudad arrays included. No brandId on Ciudad.

## Sources

### Primary (HIGH confidence)
- `docs/modulos_backend.md` -- Complete Prisma schema definitions for all entities, business rules, field validations
- `docs/flujo.md` -- Operational flow, pricing logic, service assignment rules
- `docs/explicacion.md` -- Business context, market specifics, Uruguayan travel agency operations
- `docs/design.json` v3.0.0 "Liquid Horizon" -- Brand definitions, UI specifications
- `.planning/research/ARCHITECTURE.md` -- Context splitting pattern, provider hierarchy, project structure
- `src/lib/auth.ts`, `src/lib/brands.ts` -- Existing type definitions and data patterns to follow
- `src/components/providers/AuthProvider.tsx`, `BrandProvider.tsx` -- Existing provider pattern (useMemo, split hooks)
- [React Official: Scaling Up with Reducer and Context](https://react.dev/learn/scaling-up-with-reducer-and-context) -- Canonical pattern for context + useReducer
- [MDN: Intl.NumberFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat) -- USD currency formatting API
- [MDN: crypto.randomUUID()](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID) -- Native UUID generation

### Secondary (MEDIUM confidence)
- [Kent C. Dodds: How to use React Context effectively](https://kentcdodds.com/blog/how-to-use-react-context-effectively) -- Split state/dispatch pattern
- [How to Handle React Context Performance Issues](https://oneuptime.com/blog/post/2026-01-24-react-context-performance-issues/view) -- Context splitting and memoization strategies
- [Optimizing React Context for Performance](https://www.tenxdeveloper.com/blog/optimizing-react-context-performance) -- Selector pattern, memo usage

### Tertiary (LOW confidence)
- None. All findings verified against official docs and project source documents.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- No new dependencies needed, all tools already installed and verified in Phases 1-2
- Architecture: HIGH -- Pattern established by AuthProvider/BrandProvider, confirmed by React official docs and architecture research
- Entity model: HIGH -- Derived directly from Prisma schemas in modulos_backend.md (authoritative project document)
- Seed data: HIGH -- Real-world destinations, airlines, and hotels from Uruguayan travel market context in explicacion.md and flujo.md
- Pitfalls: HIGH -- Based on concrete analysis of the entity relationships and existing codebase patterns
- Utility functions: HIGH -- Formulas explicitly defined in modulos_backend.md section 1.5

**Research date:** 2026-03-16
**Valid until:** 2026-04-16 (stable domain -- TypeScript, React Context patterns are mature)
