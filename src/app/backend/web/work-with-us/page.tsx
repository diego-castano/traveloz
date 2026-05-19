import { SettingsForm } from "../_components/SettingsForm";

export default function WebWorkWithUsPage() {
  return (
    <SettingsForm
      group="workwithus"
      title="Página /work-with-us"
      blurb="Título, subtítulo, imagen lateral y video opcional de la página 'Trabajá con nosotros'. Los CVs recibidos se gestionan en /backend/leads/postulaciones."
      publicHref="/work-with-us"
    />
  );
}
