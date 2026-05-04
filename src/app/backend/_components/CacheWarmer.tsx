/**
 * Server Component invisible que pre-calienta los buckets de unstable_cache de
 * los providers (paquetes / servicios / catálogos) ANTES de que el cliente los
 * pida.
 *
 * Cómo funciona:
 *   1. Se renderiza dentro del layout server-side de /backend/* en cada request.
 *   2. Lee la sesión y lanza las 3 server actions cacheadas en paralelo.
 *   3. NO espera resultados — solo dispara el cómputo. Si el cache ya está
 *      caliente, las actions devuelven inmediatamente desde memoria. Si está
 *      frío, esto cuenta como el primer hit y llena el cache mientras el
 *      cliente hace su propia request (la segunda hit toma el resultado
 *      cacheado en lugar de pegarle de nuevo a Postgres).
 *   4. Devuelve null — no aporta nada al árbol DOM.
 *
 * Dejarlo como Server Component permite que las llamadas a `getBaseCatalogs`
 * etc. corran en el mismo proceso que sirvió la request, llenando el cache
 * del runtime Node antes que React envíe el HTML al cliente.
 */

import { auth } from "@/lib/auth.config";
import {
  getBasePackages,
  getPackageSubEntities,
} from "@/actions/package.actions";
import {
  getBaseServices,
  getServiceSubEntities,
} from "@/actions/service.actions";
import {
  getBaseCatalogs,
  getCatalogGeography,
} from "@/actions/catalog.actions";

export default async function CacheWarmer() {
  const session = await auth();
  if (!session?.user) return null;

  // Lanza todo en paralelo y olvida. `void` documenta que el resultado no
  // importa — solo queremos que las promesas avancen y llenen el cache.
  // Cada catch evita que un fallo de red rompa el render del layout: el
  // provider del cliente igual reintenta su propia llamada al hidratarse.
  void Promise.allSettled([
    getBasePackages(undefined, { take: 18 }).catch(() => null),
    getPackageSubEntities().catch(() => null),
    getBaseServices(undefined, { alojamientosTake: 10 }).catch(() => null),
    getServiceSubEntities().catch(() => null),
    getBaseCatalogs().catch(() => null),
    getCatalogGeography().catch(() => null),
  ]);

  return null;
}
