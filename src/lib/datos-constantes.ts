// ---------------------------------------------------------------------------
// Constantes de la bóveda de datos de pago.
//
// Módulo PURO a propósito: no importa `node:crypto` ni toca la DB, así que lo
// puede importar cualquiera — un componente cliente, una pantalla del mockup
// del cotizador (JSX), un email del server. `datos-cifrado.ts` no servía para
// eso: arrastra node:crypto y no entra en un bundle de cliente.
//
// La vida de la bóveda se dice en SIETE pantallas distintas. Cuando el número
// vivía como literal en cada una, bajarlo de 96 a 72 (o subirlo) obligaba a
// acordarse de las siete: el día que se olvida una, la promesa que lee el
// pasajero deja de ser la que cumple el barrido.
// ---------------------------------------------------------------------------

/**
 * Vida de la bóveda, en horas. Pasado esto el barrido pone payload/iv/tag en
 * null y sella purgadoAt.
 *
 * El recordatorio sigue saliendo 24 h antes de la purga, sea cual sea este
 * valor. Si alguna vez baja de 24, agendar quedaría en el pasado y Resend lo
 * rechaza: `submitDatosPago` ya chequea que la fecha sea futura.
 */
export const HORAS_BOVEDA = 96;

/**
 * La misma cifra ya escrita para meter en una oración ("se borran solos a las
 * 96 horas"). Existe para que el copy no tenga que interpolar la unidad a
 * mano en cada pantalla y no se cuele un "96 hs" suelto.
 */
export const TEXTO_HORAS_BOVEDA = `${HORAS_BOVEDA} horas`;
