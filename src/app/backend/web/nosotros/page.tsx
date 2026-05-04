import { SettingsForm } from "../_components/SettingsForm";

export default function WebNosotrosPage() {
  return (
    <SettingsForm
      group="nosotros"
      title="Página Nosotros"
      blurb="Textos e imagen de la página /about."
      publicHref="/about"
    />
  );
}
