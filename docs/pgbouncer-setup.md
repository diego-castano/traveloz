# PgBouncer en Railway — guía de switch

## Estado actual (2026-05-04)

✅ Servicio `pgbouncer` deployado en Railway → estado SUCCESS.
- Image: `edoburu/pgbouncer:latest`
- Modo: `transaction` (compatible con Prisma)
- Pool: 25 conexiones por defecto, 5 mínimas, 200 clientes máx
- Puerto interno: `pgbouncer.railway.internal:6432`

✅ Variables agregadas al servicio `traveloz` (sin redeploy):
| Variable | Para qué sirve | Valor |
|---|---|---|
| `DIRECT_URL` | Migraciones, advisory locks (session mode) | `postgresql://postgres:***@postgres.railway.internal:5432/railway` |
| `DATABASE_URL_BOUNCED` | URL preparada para apuntar al bouncer | `postgresql://postgres:***@pgbouncer.railway.internal:6432/railway?pgbouncer=true&connection_limit=1` |

✅ `prisma/schema.prisma` ahora declara `directUrl = env("DIRECT_URL")`.

⚠️ **`DATABASE_URL` del servicio `traveloz` NO fue cambiado todavía.** La app sigue conectando directo al Postgres. El switch lo hacés vos cuando quieras.

---

## Cómo activar el bouncer en prod

1. Asegurate de que tu rama actual ya tenga commiteado el cambio del `schema.prisma` (`directUrl = env("DIRECT_URL")`).
2. Entrá a Railway → proyecto Traveloz → service `traveloz` → tab **Variables**.
3. Editá `DATABASE_URL`:
   - **Antes** (current):
     `postgresql://postgres:***@postgres.railway.internal:5432/railway`
   - **Después** (copiá el valor de `DATABASE_URL_BOUNCED`):
     `postgresql://postgres:***@pgbouncer.railway.internal:6432/railway?pgbouncer=true&connection_limit=1`
4. Railway re-deploya el servicio automáticamente.
5. Verificá `/api/health` y `/api/health/perf` que respondan OK.

## Cómo desactivar (rollback)

Si algo falla, en la UI de Railway editá `DATABASE_URL` de vuelta al valor original (`postgresql://postgres:***@postgres.railway.internal:5432/railway`) → Railway re-deploya y volvés al estado previo. Cero downtime real (cada conexión nueva va por la nueva URL; las viejas se cierran al terminar su request).

El servicio `pgbouncer` queda corriendo gratis pero sin tráfico. Podés borrarlo después si rollbackeás.

## Setup local (para que `prisma migrate` siga funcionando)

En tu `.env` local agregá:

```env
DATABASE_URL="postgresql://...tu-url-local..."
DIRECT_URL="postgresql://...la-misma-url-local..."   # local no necesita bouncer
```

Si `DIRECT_URL` no está seteada, Prisma usa `DATABASE_URL` para todo (no rompe).

## Cómo correr migraciones después del switch

`prisma migrate deploy` automáticamente usa `DIRECT_URL` (es para lo que está). No tenés que cambiar nada en el `package.json`.

```bash
DATABASE_URL=$DATABASE_URL_BOUNCED DIRECT_URL=$DIRECT_URL npx prisma migrate deploy
```

O en Railway, dentro del start script si lo tenés.

## Por qué `?pgbouncer=true&connection_limit=1`

- `pgbouncer=true` → Prisma desactiva prepared statements (PgBouncer en transaction mode no las soporta).
- `connection_limit=1` → cada instancia de la app abre 1 sola conexión al bouncer. El bouncer es quien hace el pooling de verdad. Sin esto, cada réplica de la app abriría hasta 21 conexiones por default y el pool se desperdicia.

## Métricas esperadas

Antes del bouncer (cold start típico):
- Primer query post-deploy: 1-3 s (TCP handshake + TLS Postgres)

Después del bouncer:
- Primer query post-deploy: <100 ms (la conexión al Postgres ya está abierta y reutilizada)
- Conexiones simultáneas estables (Postgres free tier de Railway tiene ~100 conexiones max)
- Throughput de queries cortas: 5-10× mejor

Probá con `GET /api/health/perf?n=10` antes y después para ver el speedup.

## Si algo falla — checklist

- **`prisma migrate` falla con "prepared statement already exists"** → se está ejecutando contra el bouncer en vez de DIRECT_URL. Verificá que `schema.prisma` tenga `directUrl = env("DIRECT_URL")` y que la env var esté seteada.
- **App tira "too many connections"** → bajá `connection_limit` (probá 1 o 2). El bouncer maneja el resto.
- **Latency peor que antes** → revisá que estés usando el host `pgbouncer.railway.internal` (privado) y NO el público. El público no existe (no expuse puerto público a propósito; es solo para el tráfico interno).
- **Rollback urgente** → editá `DATABASE_URL` en Railway de vuelta al valor original. Sin downtime.
