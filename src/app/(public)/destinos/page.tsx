import { getRegionesPublicas } from "@/lib/public-data";
import { DestinosGrid } from "@/components/public/DestinosGrid";

export const metadata = {
  title: "Destinos | TravelOz",
  description: "Descubrí todos nuestros destinos por región.",
};

export default async function DestinosPage() {
  const regiones = await getRegionesPublicas();
  return <DestinosGrid regiones={regiones} />;
}
