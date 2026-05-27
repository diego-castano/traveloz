import { SettingsForm } from "../_components/SettingsForm";

export default function WebRobotsPage() {
  return (
    <SettingsForm
      group="robots"
      title="Robots.txt — Indexación"
      blurb="Controla qué pueden indexar los buscadores. Usá modo 'open' para producción normal, 'maintenance' durante lanzamientos para esconder el sitio, o 'custom' si querés pegar tu propio robots.txt entero."
      publicHref="/robots.txt"
    />
  );
}
