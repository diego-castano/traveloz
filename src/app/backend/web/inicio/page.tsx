import { SettingsForm } from "../_components/SettingsForm";

export default function WebInicioPage() {
  return (
    <SettingsForm
      group="home"
      title="Página de inicio"
      blurb="Hero, video de fondo, slider de categorías, testimonios y newsletter."
      publicHref="/"
    />
  );
}
