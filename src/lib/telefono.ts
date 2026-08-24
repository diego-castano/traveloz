// ---------------------------------------------------------------------------
// El teléfono, listo para wa.me.
//
// Vive suelto y sin una sola dependencia a propósito: lo usan el cotizador del
// panel, la ficha del pasajero —que se monta también en el link público
// /c/<token>— y las plantillas de email del servidor. Si esto viviera en
// `presupuesto/derivados.ts`, cada `wa.me` del navegador del pasajero se
// llevaría puesto el `zod` de `presupuesto/schema.ts`. `derivados.ts` lo
// reexporta para quien lo busque ahí.
//
// OJO con la otra función de teléfono del sistema: `soloDigitos()` (derivados)
// normaliza para BUSCAR (saca el código de país y los ceros, así "+598 99 123
// 456" y "099123456" matchean igual). Esta hace lo contrario: AGREGA el código
// de país, porque wa.me sin código no resuelve a nadie. No se tocan entre sí.
// ---------------------------------------------------------------------------

/** Código de país de Uruguay, que es de donde escribe toda la agencia. */
const UY = "598";

/**
 * Dígitos que entiende `https://wa.me/…`.
 *
 * WhatsApp exige el número internacional completo, sin `+` ni separadores. Un
 * "099 000 222" tal cual sale de la ficha del cliente abre un chat vacío: la
 * app no adivina el país.
 *
 * Las reglas, en orden:
 *   • se tira todo lo que no sea dígito;
 *   • un prefijo internacional marcado a la vieja ("00…") se saca;
 *   • si ya arranca con 598, queda como está;
 *   • un celular uruguayo con el 0 de área (09X XXX XXX, 9 dígitos) pierde el
 *     0 y gana el 598;
 *   • un celular uruguayo sin el 0 (9X XXX XXX, 8 dígitos) gana el 598;
 *   • cualquier otra cosa —un número extranjero que ya trae su código— vuelve
 *     tal cual. Preferimos dejar pasar un número raro a romper uno bueno.
 *
 * Devuelve "" cuando no hay dígitos: quien llama decide si esconde el botón.
 */
export function telefonoWa(raw: unknown): string {
  let d = String(raw ?? "").replace(/\D/g, "");
  if (!d) return "";

  if (d.startsWith("00")) d = d.slice(2);
  if (!d) return "";

  if (d.startsWith(UY)) return d;
  if (d.length === 9 && d.startsWith("0")) return UY + d.slice(1);
  if (d.length === 8 && d.startsWith("9")) return UY + d;
  return d;
}
