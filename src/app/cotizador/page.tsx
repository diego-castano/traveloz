import type { Metadata } from "next";
import CotizadorMockup from "./CotizadorMockup";

export const metadata: Metadata = {
  title: "Cotizador · Mockup de validación | TravelOz",
  description: "Prototipo interno del módulo cotizador. Sin datos reales.",
  robots: { index: false, follow: false, nocache: true },
};

export default function CotizadorMockupPage() {
  return <CotizadorMockup />;
}
