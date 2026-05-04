import { SettingsForm } from "../_components/SettingsForm";

export default function WebCotizarPage() {
  return (
    <SettingsForm
      group="cotizar"
      title="Página /cotizar"
      blurb="Título y subtítulo del formulario standalone de cotización."
      publicHref="/cotizar"
    />
  );
}
