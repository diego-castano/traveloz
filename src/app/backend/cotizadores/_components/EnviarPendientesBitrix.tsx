"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { enviarPendientesABitrix } from "@/actions/cotizador.actions";

export function EnviarPendientesBitrix({
  landingId,
  pendientes,
}: {
  landingId: string;
  pendientes: number;
}) {
  const router = useRouter();
  const [paso, setPaso] = useState<"idle" | "confirmar" | "enviando" | "fin">("idle");
  const [enviados, setEnviados] = useState(0);
  const [errores, setErrores] = useState(0);
  const [faltan, setFaltan] = useState(pendientes);
  const [fallo, setFallo] = useState<string | null>(null);

  async function enviar() {
    setPaso("enviando");
    setFallo(null);
    let env = 0;
    let err = 0;
    let resto = pendientes;
    try {
      // Tandas de 25: sigue mientras queden pendientes y la tanda anterior haya
      // enviado algo (si todo falla, no insiste en bucle).
      while (resto > 0) {
        const r = await enviarPendientesABitrix(landingId);
        env += r.enviados;
        err += r.errores;
        resto = r.pendientes;
        setEnviados(env);
        setErrores(err);
        setFaltan(resto);
        if (r.enviados === 0) break;
      }
    } catch (e) {
      setFallo(e instanceof Error ? e.message : "No se pudo enviar.");
    }
    setPaso("fin");
    router.refresh();
  }

  return (
    <div className="mt-8 rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
      <p>
        {pendientes} {pendientes === 1 ? "envío todavía no está" : "envíos todavía no están"} en
        Bitrix.
      </p>
      {paso === "idle" && (
        <button
          type="button"
          onClick={() => setPaso("confirmar")}
          className="mt-3 rounded-lg bg-neutral-900 px-4 py-2 font-medium text-white"
        >
          Enviar a Bitrix
        </button>
      )}
      {paso === "confirmar" && (
        <div className="mt-3">
          <p>
            Se van a crear hasta {pendientes} negocios en Bitrix con el origen elegido. ¿Seguimos?
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={enviar}
              className="rounded-lg bg-neutral-900 px-4 py-2 font-medium text-white"
            >
              Confirmar
            </button>
            <button
              type="button"
              onClick={() => setPaso("idle")}
              className="rounded-lg border border-neutral-300 px-4 py-2 font-medium text-neutral-600"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
      {(paso === "enviando" || paso === "fin") && (
        <p className="mt-3 font-medium">
          Enviados {enviados} · Errores {errores} · Faltan {faltan}
        </p>
      )}
      {fallo && <p className="mt-2 text-red-600">{fallo}</p>}
    </div>
  );
}
