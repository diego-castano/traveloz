import { SettingsForm } from "../_components/SettingsForm";

export default function WebFooterPage() {
  return (
    <SettingsForm
      group="footer"
      title="Footer"
      blurb="Columnas, enlaces, redes sociales y copyright del pie del sitio. Los campos JSON aceptan un array [{label, href}]."
    />
  );
}
