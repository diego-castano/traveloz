// ---------------------------------------------------------------------------
// Helpers de identidad de "Pasajeros y Pagos". Módulo PURO a propósito: sin
// Prisma, sin node:crypto, sin "use server". Lo importan tanto las actions
// como los componentes cliente del panel.
//
// Desde el 26/08/2026 el formulario público pide "Nombre y apellido" en un
// solo campo y lo guarda entero en PasajeroDato.nombres (`apellidos` queda
// ""). Los envíos anteriores tienen el nombre partido en dos columnas y se
// tienen que seguir viendo completos: de eso se encarga `nombreCompleto`.
// ---------------------------------------------------------------------------

/** "Ana" + "Pérez" → "Ana Pérez". "Ana Pérez" + "" → "Ana Pérez". */
export function nombreCompleto(p: {
  nombres: string;
  apellidos?: string | null;
}): string {
  return `${p.nombres ?? ""} ${p.apellidos ?? ""}`.replace(/\s+/g, " ").trim();
}

/**
 * Con qué nombre se muestra un registro de la bóveda. El cliente lo pidió por
 * PASAJERO, no por titular de la tarjeta (26/08/2026). Los registros viejos no
 * tienen `pasajeroNombre`: para esos, el titular sigue siendo la identidad.
 */
export function nombrePago(p: {
  pasajeroNombre?: string | null;
  titular: string;
}): string {
  const n = p.pasajeroNombre?.trim();
  return n && n.length > 0 ? n : p.titular;
}
