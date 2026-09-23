"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CotizadorCtx, CATALOGO_VACIO } from "@/app/backend/cotizador/_mockup/contexto";
import { SalidaPasajero } from "@/app/backend/cotizador/_mockup/telefono";
import { calcularTramos } from "@/app/backend/cotizador/_mockup/tramos";
import { VARIANTES_OPCIONES } from "@/app/backend/cotizador/_mockup/opciones-variantes";

/* ═══════════════════════════════════════════════════════════════════════════
   PROPUESTA DE OPCIONES — la ficha del pasajero con otra forma de mostrar las
   opciones, para que el cliente elija (23/09)

   Es la misma `SalidaPasajero` del link público, con tres diferencias:
     • no registra aperturas: nadie tiene que ver lecturas falsas en el
       seguimiento de esa cotización;
     • sin `onConfirmar`, "Confirmar esta opción" solo cambia la pantalla,
       igual que en la vista previa del editor: la cotización real no se toca;
     • arriba va una barra para saltar entre propuestas.
   ═══════════════════════════════════════════════════════════════════════════ */

const CORTE_DESK = 768;

export default function PropuestaOpciones({
  variante, q, vendedor, ajustes, hoteles, aeropuertos, siteBaseUrl, numero,
}) {
  const ctx = useMemo(() => {
    const porId = hoteles || {};
    return {
      yo: null,
      vendedores: [vendedor],
      siteBaseUrl: siteBaseUrl || "",
      esAdmin: false,
      catalogo: {
        ...CATALOGO_VACIO,
        hoteles: Object.values(porId),
        hotelById: (id) => (id ? porId[id] : undefined),
        cargando: false,
        progreso: "",
      },
      ajustes,
      aeropuertos: aeropuertos || {},
      aerolineas: {},
    };
  }, [hoteles, vendedor, ajustes, aeropuertos, siteBaseUrl]);

  const tramos = useMemo(() => calcularTramos(q), [q]);

  const [ancho, setAncho] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const mq = window.matchMedia(`(min-width:${CORTE_DESK}px)`);
    const aplicar = () => setAncho(mq.matches);
    aplicar();
    mq.addEventListener("change", aplicar);
    return () => mq.removeEventListener("change", aplicar);
  }, []);

  const actual = VARIANTES_OPCIONES.find((v) => v.id === variante) || VARIANTES_OPCIONES[0];

  return (
    <CotizadorCtx.Provider value={ctx}>
      <div style={{ position: "sticky", top: 0, zIndex: 50, margin: "0 auto 14px", maxWidth: 760,
        padding: "10px 12px", borderRadius: 14, background: "rgba(26,26,46,.92)", color: "#fff",
        backdropFilter: "blur(8px)", boxShadow: "0 10px 30px -14px rgba(0,0,0,.5)" }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase",
          opacity: .7 }}>
          Vista de prueba · no la ven los pasajeros · {numero}
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, margin: "3px 0 9px" }}>
          {actual.n === 0 ? "Como está hoy" : `Propuesta ${actual.n}: ${actual.nombre}`}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {VARIANTES_OPCIONES.map((v) => {
            const on = v.id === actual.id;
            return (
              <Link key={v.id} href={`/propuestas/opciones/${v.n}`} scroll={false}
                style={{ padding: "6px 11px", borderRadius: 999, fontSize: 12, fontWeight: 700,
                  textDecoration: "none", whiteSpace: "nowrap",
                  background: on ? "#fff" : "rgba(255,255,255,.12)", color: on ? "#1A1A2E" : "#fff" }}>
                {v.n === 0 ? "Hoy" : `${v.n}`}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="cot-hoja">
        <SalidaPasajero
          /* la clave fuerza a arrancar de cero al cambiar de propuesta:
             cada una decide qué opción arranca abierta */
          key={actual.id}
          q={q}
          marca="traveloz"
          vendedor={vendedor.id}
          tramos={tramos}
          modo={ancho ? "desk" : "cel"}
          varianteOpciones={actual.id === "actual" ? null : actual.id}
          animar
        />
      </div>
    </CotizadorCtx.Provider>
  );
}
