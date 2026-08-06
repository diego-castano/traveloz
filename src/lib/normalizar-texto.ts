// ---------------------------------------------------------------------------
// normalizarTexto: el lugar canónico de ahora en más para comparar texto
// escrito por una persona contra datos del catálogo.
//
// Pasa a minúsculas, descompone en NFD y borra los diacríticos, así "turquia"
// matchea "Turquía", "mexico" matchea "México" y "sao paulo" matchea
// "São Paulo". Nadie escribe las tildes en un buscador, y sin esto el
// typeahead devolvía cero resultados y parecía roto.
//
// El mismo patrón está copiado a mano en varios archivos viejos del repo. No
// los migramos de prepo: cuando toques uno, cambialo por este helper.
// ---------------------------------------------------------------------------

export function normalizarTexto(valor: string): string {
  return valor
    .toLowerCase()
    .normalize("NFD")
    // \u0300-\u036f es el rango de marcas combinantes (las tildes sueltas)
    // que deja el NFD. Va con escapes y no con los caracteres literales para
    // que ninguna herramienta lo rompa al reindentar.
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}
