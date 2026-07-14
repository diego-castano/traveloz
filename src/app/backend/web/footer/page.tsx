import { SettingsForm } from "../_components/SettingsForm";

export default function WebFooterPage() {
  return (
    <SettingsForm
      group="footer"
      title="Footer"
      blurb={
        "El pie del sitio tiene 4 columnas. Col 1: logo + texto + redes sociales. " +
        "Col 2: datos de contacto (se editan en Web → General). Col 3: lista de enlaces útiles. " +
        "Los enlaces se editan por filas (Texto + Enlace); usá el botón de la papelera para quitar uno."
      }
      publicHref="/"
    />
  );
}
