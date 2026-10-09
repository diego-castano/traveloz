"use client";

// Autoguardado del constructor: 1,5 s después del último cambio, un pedido
// a la vez (si hay cambios mientras guarda, sale otro con lo último). Sin
// conexión reintenta con espera creciente. Si otra persona guardó antes
// (conflicto de versión) frena y avisa.

import { useCallback, useEffect, useRef, useState } from "react";
import type { ApiConstructor } from "./api";
import type { EstadoBorrador } from "./estado";

const ESPERA = 1500;
const TOPE_REINTENTO = 30000;

export type EstadoGuardado =
  | { tipo: "guardado"; en: number | null }
  | { tipo: "pendiente" }
  | { tipo: "guardando" }
  | { tipo: "sin-conexion"; intento: number }
  | { tipo: "error"; mensaje: string }
  | { tipo: "conflicto"; mensaje: string };

export function useAutoguardado({
  id,
  api,
  estado,
  revisionInicial,
  activo,
}: {
  id: string;
  api: ApiConstructor;
  estado: EstadoBorrador;
  revisionInicial: number;
  activo: boolean;
}) {
  const [guardado, setGuardado] = useState<EstadoGuardado>({ tipo: "guardado", en: null });
  const [revision, setRevision] = useState(revisionInicial);
  const revisionRef = useRef(revisionInicial);
  const ultimo = useRef(estado);
  ultimo.current = estado;
  const guardadoHasta = useRef(estado.cambios);
  const enVuelo = useRef<Promise<boolean> | null>(null);
  const timer = useRef<number>();
  const intentos = useRef(0);
  const frenado = useRef(false);

  const guardar = useCallback(async (): Promise<void> => {
    window.clearTimeout(timer.current);
    if (frenado.current) return;
    if (enVuelo.current) {
      await enVuelo.current;
      if (ultimo.current.cambios !== guardadoHasta.current) return guardar();
      return;
    }
    const foto = ultimo.current;
    if (foto.cambios === guardadoHasta.current) return;

    const vuelo = (async () => {
      setGuardado({ tipo: "guardando" });
      let r: Awaited<ReturnType<ApiConstructor["guardar"]>> | null = null;
      try {
        r = await api.guardar(id, { revision: revisionRef.current, borrador: foto.borrador });
      } catch {
        r = null;
      }
      if (!r) {
        const n = ++intentos.current;
        setGuardado({ tipo: "sin-conexion", intento: n });
        timer.current = window.setTimeout(() => void guardar(), Math.min(TOPE_REINTENTO, 1000 * 2 ** n));
        return false;
      }
      intentos.current = 0;
      if (r.ok) {
        revisionRef.current = r.data.revision;
        setRevision(r.data.revision);
        guardadoHasta.current = foto.cambios;
        setGuardado(
          ultimo.current.cambios === foto.cambios ? { tipo: "guardado", en: Date.now() } : { tipo: "pendiente" },
        );
        return true;
      }
      if (r.conflicto) {
        frenado.current = true;
        setGuardado({ tipo: "conflicto", mensaje: r.error });
      } else {
        // Error de validación: se reintenta con el próximo cambio.
        setGuardado({ tipo: "error", mensaje: r.error });
      }
      return false;
    })();
    enVuelo.current = vuelo;
    const ok = await vuelo;
    enVuelo.current = null;
    // Lo que se escribió mientras guardaba sale en seguida.
    if (ok && ultimo.current.cambios !== guardadoHasta.current) {
      timer.current = window.setTimeout(() => void guardar(), 200);
    }
  }, [api, id]);

  useEffect(() => {
    if (!activo || frenado.current || estado.cambios === guardadoHasta.current) return;
    setGuardado((g) => (g.tipo === "guardando" || g.tipo === "sin-conexion" ? g : { tipo: "pendiente" }));
    if (intentos.current > 0) return; // ya hay un reintento agendado
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void guardar(), ESPERA);
  }, [estado.cambios, activo, guardar]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  // Aviso del navegador si se cierra con cambios sin guardar.
  const pendiente = guardado.tipo !== "guardado" && guardado.tipo !== "conflicto";
  useEffect(() => {
    if (!pendiente) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [pendiente]);

  const guardarYa = useCallback(async () => {
    if (frenado.current) return false;
    await guardar();
    if (enVuelo.current) await enVuelo.current;
    return ultimo.current.cambios === guardadoHasta.current && intentos.current === 0;
  }, [guardar]);

  return { guardado, revision, guardarYa };
}
