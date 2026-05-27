import { SettingsForm } from "../_components/SettingsForm";

export default function WebSeoPage() {
  return (
    <SettingsForm
      group="seo"
      title="SEO — Meta tags por ruta"
      blurb="Título, descripción y OG image por defecto + overrides por ruta pública. Lo que tipees acá aparece como <title>, meta description y card de redes sociales cuando se comparte el link."
      publicHref="/"
    />
  );
}
