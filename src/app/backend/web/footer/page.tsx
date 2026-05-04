import { SettingsForm } from "../_components/SettingsForm";

export default function WebFooterPage() {
  return (
    <SettingsForm
      group="footer"
      title="Footer"
      blurb={
        "El pie del sitio tiene 4 columnas. Col 1: logo + texto + redes sociales. " +
        "Col 2: datos de contacto (se editan en Web → General). Col 3: lista de enlaces útiles. " +
        "Col 4: logos de partners (hardcodeado). El campo JSON acepta un array [{label, href}]."
      }
      publicHref="/"
    />
  );
}
