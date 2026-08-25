"use client";

/* ═══════════════════════════════════════════════════════════════════════════
   MIS LINKS — los dos formularios del vendedor, a un toque

   Pedido del cliente: "la opción de tener mi link de datos de pasajero tiene
   que estar arriba en la cotización, así puedo obtenerlo rápido". Antes vivía
   adentro del modal Compartir, tres clicks abajo y solo con la cotización ya
   guardada. Ahora es un botón en la barra del inicio y otro en el header del
   editor.

   Los dos links son permanentes y del vendedor, no de la cotización: el mismo
   `/datos-de-pasajeros/<slug>` sirve para todos sus pasajeros. Por eso el
   popover no necesita que haya nada guardado — copiar y mandar por WhatsApp
   no tocan el server.

   Quién firma:
     · el vendedor logueado, o
     · el que el admin haya elegido en "Ver como" / en el selector del editor.
   `vendedorId` manda; sin él va `yo`.

   Lo que NO hace: pedir los datos por email. Eso crea una solicitud con token
   y bitácora atada a una cotización concreta, y sigue viviendo donde tiene que
   vivir — la pestaña "Datos del pasajero" del modal Compartir.
   ═══════════════════════════════════════════════════════════════════════════ */

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Link2, Copy, Check, Smartphone, ClipboardList, CreditCard, AlertCircle,
} from "lucide-react";
import { telefonoWa } from "@/lib/telefono";
import { useCtz, buscarVendedor } from "./contexto";
import { Btn } from "./ui";

/* El mismo par de mensajes que manda la pestaña "Datos del pasajero" del modal
   Compartir. Si allá cambian, acá también. */
function textoDe(tipo, nombre, numero) {
  const quien = nombre ? ` ${nombre}` : "";
  const cual = numero ? ` ${numero}` : "";
  return tipo === "PAGO"
    ? `Hola${quien}, para cerrar la reserva${cual} necesito los datos de la tarjeta. Se cargan en este formulario seguro 👇`
    : `Hola${quien}, para arrancar la reserva${cual} necesito los datos de los pasajeros. Se cargan acá 👇`;
}

/* ── Una fila del popover ─────────────────────────────────────────────── */
function Fila({ tipo, Icon, titulo, ayuda, url, telWa, nombre, numero, copiado, onCopiar }) {
  const clave = `ml-${tipo}`;

  const alWhatsApp = () => {
    const texto = `${textoDe(tipo, nombre, numero)}\n\n${url}`;
    /* Sin teléfono del cliente igual sirve: wa.me sin número abre WhatsApp con
       el mensaje escrito y el vendedor elige el chat. */
    const base = telWa ? `https://wa.me/${telWa}` : "https://wa.me/";
    window.open(`${base}?text=${encodeURIComponent(texto)}`, "_blank", "noopener");
  };

  return (
    <div className="ml-fila">
      <div className="ml-fila-t">
        <Icon size={13} style={{ color:"var(--violet)", flexShrink:0 }} />
        {titulo}
      </div>
      <div className="ml-fila-s">{ayuda}</div>

      <div className="ml-url">
        <Link2 size={11} style={{ color:"var(--violet)", flexShrink:0 }} />
        <span className="mono" style={{ fontSize:10.5 }}>{url}</span>
      </div>

      <div style={{ display:"flex", gap:6 }}>
        <Btn size="xs" style={{ flex:1, height:32 }} onClick={() => onCopiar(url, clave)}
          title="Copiar el link al portapapeles">
          {copiado === clave ? <><Check size={12} /> Copiado</> : <><Copy size={12} /> Copiar</>}
        </Btn>
        <Btn size="xs" style={{ flex:1, height:32 }} onClick={alWhatsApp}
          title={telWa ? "Abre tu WhatsApp con el mensaje y el link" : "Abre WhatsApp para que elijas el chat"}>
          <Smartphone size={12} /> WhatsApp
        </Btn>
      </div>
    </div>
  );
}

/**
 * El botón + su popover.
 *
 * @param vendedorId  Quién firma. `null` (o "todos") = el usuario logueado.
 * @param cliente     `q.cliente` de la cotización abierta, si hay una. De ahí
 *                    salen el nombre y el teléfono del saludo.
 * @param numero      Número de la cotización, para nombrarla en el mensaje.
 * @param compacto    `true` en el header del editor (botón chico de barra).
 */
function MisLinks({ vendedorId = null, cliente = null, numero = "", compacto = false, toast }) {
  const { vendedores, yo } = useCtz();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const [copiado, setCopiado] = useState(null);
  const refBtn = useRef(null);
  const refPop = useRef(null);

  const V = vendedorId && vendedorId !== "todos"
    ? buscarVendedor(vendedores, vendedorId)
    : (yo || buscarVendedor(vendedores, null));

  const esMio = !yo?.id || !V?.id || V.id === yo.id;
  const nombre = String(cliente?.nombre || "").trim();
  const telWa = telefonoWa(cliente?.telefono);

  const medir = useCallback(() => {
    const el = refBtn.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const w = Math.min(342, Math.max(220, window.innerWidth - 16));
    /* alineado a la derecha del botón: los dos lugares donde vive están del
       lado derecho de la barra */
    const left = Math.min(Math.max(8, r.right - w), Math.max(8, window.innerWidth - w - 8));
    setPos({ left, top: Math.round(r.bottom + 8) });
  }, []);

  useEffect(() => {
    if (!open) return;
    const re = () => medir();
    window.addEventListener("scroll", re, true);
    window.addEventListener("resize", re);
    return () => {
      window.removeEventListener("scroll", re, true);
      window.removeEventListener("resize", re);
    };
  }, [open, medir]);

  useEffect(() => {
    if (!open) return;
    const fuera = (e) => {
      if (refBtn.current?.contains(e.target)) return;
      if (refPop.current?.contains(e.target)) return;
      setOpen(false);
    };
    const esc = (e) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      setOpen(false);
      refBtn.current?.focus();
    };
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const copiar = async (texto, clave) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(clave);
      setTimeout(() => setCopiado(null), 2200);
    } catch {
      toast?.({ msg:"El navegador no dejó copiar — seleccioná el texto a mano", tone:"warn" });
    }
  };

  const cont = open && typeof document !== "undefined"
    ? document.querySelector(".ctz") || document.body
    : null;

  const sinLinks = !V?.linkDatos && !V?.linkPago;

  return (
    <>
      <button
        ref={refBtn}
        className={compacto ? "btn btn-s btn-sm" : "btn btn-s"}
        style={compacto ? undefined : { height:40, borderRadius:12, paddingInline:14 }}
        aria-expanded={open}
        aria-haspopup="dialog"
        title="Los links donde el pasajero carga sus datos"
        onClick={() => { if (!open) medir(); setOpen((v) => !v); }}>
        <Link2 size={compacto ? 13 : 15} />
        {/* en el header del editor la barra ya viene apretada: el rótulo se
            esconde igual que el de "Ver como pasajero" */}
        <span className={compacto ? "only-ancho" : undefined}>Mis links</span>
      </button>

      {open && cont && createPortal(
        <div ref={refPop} className="ml-pop" role="dialog" aria-label="Mis links de datos"
          style={{ left: pos?.left ?? 0, top: pos?.top ?? 0 }}>
          <div className="ml-head">
            <div style={{ width:24, height:24, borderRadius:8, display:"grid", placeItems:"center",
              background:"rgba(120,90,229,.11)", color:"var(--violet)", flexShrink:0 }}>
              <Link2 size={13} />
            </div>
            <div style={{ minWidth:0 }}>
              <div className="ml-head-t">Mis links</div>
              <div className="ml-head-s">
                {esMio ? "Permanentes, siempre los mismos" : `Los de ${V.nombre}`}
              </div>
            </div>
          </div>

          {sinLinks ? (
            <div className="ml-sin">
              <div style={{ display:"flex", alignItems:"flex-start", gap:7 }}>
                <AlertCircle size={13} style={{ color:"var(--ink-amber)", flexShrink:0, marginTop:1 }} />
                <span>
                  {esMio
                    ? <>Todavía no tenés link activo. Se prende en <Link href="/backend/mi-perfil">Mi perfil</Link>, con tu dirección pública.</>
                    : <>{V.nombre} no tiene link activo. Se prende desde <Link href="/backend/perfiles">Perfiles</Link>.</>}
                </span>
              </div>
            </div>
          ) : (
            <>
              {V.linkDatos && (
                <Fila tipo="DATOS" Icon={ClipboardList} titulo="Datos de pasajeros"
                  ayuda="Nombre, documento y fecha de nacimiento de cada pasajero."
                  url={V.linkDatos} telWa={telWa} nombre={nombre} numero={numero}
                  copiado={copiado} onCopiar={copiar} />
              )}
              {V.linkPago && (
                <Fila tipo="PAGO" Icon={CreditCard} titulo="Datos de tarjeta"
                  ayuda="Formulario seguro: los datos no pasan por WhatsApp ni por mail."
                  url={V.linkPago} telWa={telWa} nombre={nombre} numero={numero}
                  copiado={copiado} onCopiar={copiar} />
              )}
            </>
          )}
        </div>,
        cont,
      )}
    </>
  );
}

export { MisLinks };
