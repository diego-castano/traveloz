/**
 * Guard de seguridad para seeds y scripts que mutan o borran datos (D2).
 *
 * Estos scripts (wipe + reseed, backfills, fixes) son inofensivos en dev pero
 * catastróficos si alguien los corre por error apuntando a la DB de producción.
 * Llamá `assertSeedAllowed("nombre-del-script")` como primera línea del módulo.
 *
 * En producción aborta salvo que se exporte explícitamente `ALLOW_PROD_SEED=1`,
 * de modo que correrlo contra prod sea siempre una decisión consciente.
 */
export function assertSeedAllowed(scriptName = "seed"): void {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_PROD_SEED !== "1"
  ) {
    throw new Error(
      `[${scriptName}] Bloqueado: NODE_ENV=production y este script muta o borra datos. ` +
        `Si de verdad querés correrlo contra producción, exportá ALLOW_PROD_SEED=1.`,
    );
  }
}
