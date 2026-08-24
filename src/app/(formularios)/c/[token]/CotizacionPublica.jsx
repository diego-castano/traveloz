"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CotizadorCtx, CATALOGO_VACIO } from "@/app/backend/cotizador/_mockup/contexto";
import { SalidaPasajero } from "@/app/backend/cotizador/_mockup/telefono";
import { calcularTramos } from "@/app/backend/cotizador/_mockup/tramos";
import { indiceSeccion } from "@/lib/presupuesto/secciones";
import {
  confirmarDesdeLink,
  solicitarRevisionDesdeLink,
} from "@/actions/presupuesto-publico.actions";

/* ═══════════════════════════════════════════════════════════════════════════
   COTIZACIÓN PÚBLICA — lo que abre el pasajero desde su link

   Es la MISMA `SalidaPasajero` que el vendedor ve en el editor y en la vista
   previa del drawer. Nada se reimplementa acá: si el pasajero viera un markup
   distinto del que el vendedor aprobó, la vista previa dejaría de servir para
   lo único que sirve.

   Lo que sí cambia respecto de la previa:
     • los botones llaman las actions públicas en vez de un useState;
     • se registra la lectura (apertura, hasta dónde bajó, cuánto tiempo);
     • el ancho de pantalla decide `cel` o `desk`, sin marco de teléfono.
   ═══════════════════════════════════════════════════════════════════════════ */

/** A partir de acá se dibuja la versión de escritorio. */
const CORTE_DESK = 768;

/** Cada cuánto se manda el progreso de lectura mientras la pestaña está viva. */
const LATIDO_MS = 15_000;

const ENDPOINT = "/api/cotizador/apertura";

export default function CotizacionPublica({
  token,
  q,
  vendedor,
  ajustes,
  hoteles,
  aeropuertos,
  aerolineas,
  siteBaseUrl,
  print = false,
  /* id de la opción ya confirmada, o null. Sin default: con `= null` TypeScript
     infiere el tipo del prop como `null` y la página no puede pasarle un id. */
  confirmadaInicial,
}) {
  const yaConfirmada = confirmadaInicial || null;
  /* ── contexto del cotizador, armado a mano ───────────────────────────────
     Acá no hay panel: ni PackageProvider ni ServiceProvider. El catálogo se
     reduce a los hoteles que esta cotización nombra, que el server ya
     resolvió y mandó indexados por id. */
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
      aerolineas: aerolineas || {},
    };
  }, [hoteles, vendedor, ajustes, aeropuertos, aerolineas, siteBaseUrl]);

  const tramos = useMemo(() => calcularTramos(q), [q]);

  /* ── formato: celular o escritorio ───────────────────────────────────────
     Se arranca en "cel" y se corrige en el primer efecto. Ir al revés haría
     que el celular —que es de donde se abren casi todas— pinte una vez la
     versión ancha y salte. */
  const [ancho, setAncho] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia(`(min-width:${CORTE_DESK}px)`);
    const aplicar = () => setAncho(mq.matches);
    aplicar();
    mq.addEventListener("change", aplicar);
    return () => mq.removeEventListener("change", aplicar);
  }, []);

  /* ── tracking de lectura ─────────────────────────────────────────────────
     La impresión no cuenta: es el vendedor guardando el PDF, no el pasajero
     leyendo. */
  const aperturaRef = useRef(null);
  const seccionRef = useRef("encabezado");
  const enviadoRef = useRef({ seccion: null, segundos: 0 });
  const inicioRef = useRef(0);
  const contRef = useRef(null);

  useEffect(() => {
    if (print) return undefined;
    let vivo = true;
    inicioRef.current = Date.now();

    const segundos = () => Math.round((Date.now() - inicioRef.current) / 1000);

    /* Primer golpe: nace la apertura y volvemos con su id. Todo lo demás
       cuelga de eso, así que hasta que no llegue no se manda nada más. */
    const abrir = async () => {
      try {
        const res = await fetch(ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        if (!res.ok) return;
        const json = await res.json();
        if (vivo && json?.aperturaId) aperturaRef.current = json.aperturaId;
      } catch {
        /* el pasajero no tiene por qué enterarse de que no medimos */
      }
    };
    void abrir();

    /* Hasta dónde bajó. Se queda con la sección más avanzada que entró en
       pantalla: volver a subir al encabezado no borra que ya leyó el precio. */
    const io = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (!e.isIntersecting) continue;
          const clave = e.target.getAttribute("data-sec");
          if (indiceSeccion(clave) > indiceSeccion(seccionRef.current)) {
            seccionRef.current = clave;
          }
        }
      },
      { threshold: 0.25 },
    );
    const nodos = (contRef.current || document).querySelectorAll("[data-sec]");
    nodos.forEach((n) => io.observe(n));

    const mandar = (conBeacon) => {
      const id = aperturaRef.current;
      if (!id) return;
      const seg = segundos();
      const cambio =
        seccionRef.current !== enviadoRef.current.seccion ||
        seg - enviadoRef.current.segundos >= 10;
      if (!cambio) return;
      enviadoRef.current = { seccion: seccionRef.current, segundos: seg };

      const cuerpo = JSON.stringify({
        token,
        aperturaId: id,
        seccion: seccionRef.current,
        segundos: seg,
      });
      // sendBeacon sobrevive al cierre de la pestaña; fetch, no siempre.
      if (conBeacon && navigator.sendBeacon) {
        navigator.sendBeacon(ENDPOINT, new Blob([cuerpo], { type: "application/json" }));
        return;
      }
      void fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: cuerpo,
        keepalive: true,
      }).catch(() => {});
    };

    const latido = setInterval(() => mandar(false), LATIDO_MS);
    const alOcultar = () => {
      if (document.visibilityState === "hidden") mandar(true);
    };
    const alSalir = () => mandar(true);
    document.addEventListener("visibilitychange", alOcultar);
    window.addEventListener("pagehide", alSalir);

    return () => {
      vivo = false;
      clearInterval(latido);
      io.disconnect();
      document.removeEventListener("visibilitychange", alOcultar);
      window.removeEventListener("pagehide", alSalir);
      mandar(true);
    };
  }, [token, print]);

  /* ── acciones del pasajero ─────────────────────────────────────────────
     El honeypot es un input de verdad, escondido fuera de pantalla: un bot que
     completa todo lo que encuentra lo llena y el server descarta el envío. Con
     el "" fijo que había antes el campo no filtraba nada. El nombre de la
     opción NO viaja: lo resuelve el server contra el contenido guardado. */
  const hpRef = useRef(null);
  const honeypot = useCallback(() => hpRef.current?.value ?? "", []);

  const onConfirmar = useCallback(
    async (opcion) =>
      confirmarDesdeLink(token, {
        opcionId: opcion?.id ?? null,
        honeypot: honeypot(),
      }),
    [token, honeypot],
  );

  const onRevision = useCallback(
    async () => solicitarRevisionDesdeLink(token, { honeypot: honeypot() }),
    [token, honeypot],
  );

  /* ── impresión: la misma hoja que arma el editor, sin la barra de acciones
        (el vendedor no está de este lado). Es la superficie que va a levantar
        el render server-side del PDF. ── */
  if (print) {
    return (
      <CotizadorCtx.Provider value={ctx}>
        <div className="print-root">
          <div className="print-hoja">
            <SalidaPasajero
              q={q}
              marca="traveloz"
              vendedor={vendedor.id}
              tramos={tramos}
              modo="print"
              confirmadaInicial={yaConfirmada}
            />
          </div>
        </div>
      </CotizadorCtx.Provider>
    );
  }

  return (
    <CotizadorCtx.Provider value={ctx}>
      <div ref={contRef} className="cot-hoja">
        {/* trampa para bots: fuera de pantalla, fuera del tabulador y sin
            autocompletado, así ningún pasajero lo ve ni lo completa sin querer */}
        <input
          ref={hpRef}
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          defaultValue=""
          style={{ position:"absolute", left:"-9999px", top:0, width:1, height:1,
            opacity:0, pointerEvents:"none" }}
        />
        <SalidaPasajero
          q={q}
          marca="traveloz"
          vendedor={vendedor.id}
          tramos={tramos}
          modo={ancho ? "desk" : "cel"}
          onConfirmar={onConfirmar}
          onRevision={onRevision}
          confirmadaInicial={yaConfirmada}
        />
      </div>
    </CotizadorCtx.Provider>
  );
}
