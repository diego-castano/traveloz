// ---------------------------------------------------------------------------
// /backend/perfiles/auditoria — lectura del audit log (R2).
// Server component: solo ADMIN. Filtra por namespace de acción + email del
// actor, pagina de a 50. El log es append-only (se escribe en login, CRUD de
// usuarios, cambios de password/PIN, lockouts).
// ---------------------------------------------------------------------------

import Link from "next/link";
import { getAuditLogs } from "@/actions/audit.actions";

export const metadata = { title: "Auditoría — TravelOz" };

const PAGE_SIZE = 50;

function fmtDate(d: Date): string {
  return new Intl.DateTimeFormat("es-UY", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(d));
}

function buildHref(params: { page?: number; action?: string; q?: string }): string {
  const sp = new URLSearchParams();
  if (params.action) sp.set("action", params.action);
  if (params.q) sp.set("q", params.q);
  if (params.page && params.page > 1) sp.set("page", String(params.page));
  const qs = sp.toString();
  return qs ? `?${qs}` : "?";
}

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: { page?: string; action?: string; q?: string };
}) {
  const action = typeof searchParams.action === "string" ? searchParams.action : "";
  const q = typeof searchParams.q === "string" ? searchParams.q : "";
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);

  let data;
  try {
    data = await getAuditLogs({
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      action: action || undefined,
      q: q || undefined,
    });
  } catch {
    return (
      <div style={{ padding: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Auditoría</h1>
        <p style={{ color: "#b91c1c", marginTop: 12 }}>
          Acceso restringido a administradores.
        </p>
      </div>
    );
  }

  const { rows, total, actions } = data;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1a1a2e" }}>
          Registro de auditoría
        </h1>
        <p style={{ color: "#666", fontSize: 14, marginTop: 4 }}>
          Eventos de seguridad: inicios de sesión, cambios de usuarios, contraseñas,
          PIN y bloqueos. {total.toLocaleString("es-UY")} registros.
        </p>
      </div>

      {/* Filtros — GET form, sin JS */}
      <form
        method="get"
        style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}
      >
        <select
          name="action"
          defaultValue={action}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #ddd",
            fontSize: 14,
          }}
        >
          <option value="">Todas las acciones</option>
          {actions.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Buscar por email…"
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #ddd",
            fontSize: 14,
            minWidth: 220,
          }}
        />
        <button
          type="submit"
          style={{
            padding: "8px 18px",
            borderRadius: 8,
            border: "none",
            background: "#1a1a2e",
            color: "#fff",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Filtrar
        </button>
        {(action || q) && (
          <Link
            href="?"
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: "1px solid #ddd",
              color: "#555",
              textDecoration: "none",
              fontSize: 14,
              lineHeight: "22px",
            }}
          >
            Limpiar
          </Link>
        )}
      </form>

      {rows.length === 0 ? (
        <p style={{ color: "#888", padding: "40px 0", textAlign: "center" }}>
          No hay registros para este filtro.
        </p>
      ) : (
        <div style={{ overflowX: "auto", border: "1px solid #eee", borderRadius: 12 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
            <thead>
              <tr style={{ background: "#f7f7fa", textAlign: "left" }}>
                <th style={th}>Fecha</th>
                <th style={th}>Acción</th>
                <th style={th}>Actor</th>
                <th style={th}>Objetivo</th>
                <th style={th}>IP</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} style={{ borderTop: "1px solid #f0f0f3" }}>
                  <td style={{ ...td, whiteSpace: "nowrap", color: "#666" }}>
                    {fmtDate(r.createdAt)}
                  </td>
                  <td style={td}>
                    <code
                      style={{
                        background: "#f0f0f5",
                        padding: "2px 7px",
                        borderRadius: 6,
                        fontSize: 12.5,
                      }}
                    >
                      {r.action}
                    </code>
                  </td>
                  <td style={td}>{r.userEmail ?? "—"}</td>
                  <td style={{ ...td, color: "#666" }}>
                    {r.targetType ? `${r.targetType}${r.targetId ? `:${r.targetId}` : ""}` : "—"}
                  </td>
                  <td style={{ ...td, color: "#999", fontFamily: "monospace", fontSize: 12 }}>
                    {r.ipAddress ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 18,
          }}
        >
          <span style={{ color: "#888", fontSize: 13 }}>
            Página {page} de {totalPages}
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            {page > 1 && (
              <Link href={buildHref({ page: page - 1, action, q })} style={pageBtn}>
                ← Anterior
              </Link>
            )}
            {page < totalPages && (
              <Link href={buildHref({ page: page + 1, action, q })} style={pageBtn}>
                Siguiente →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const th: React.CSSProperties = {
  padding: "10px 14px",
  fontWeight: 600,
  color: "#444",
  fontSize: 12.5,
};
const td: React.CSSProperties = { padding: "10px 14px", verticalAlign: "top" };
const pageBtn: React.CSSProperties = {
  padding: "7px 14px",
  borderRadius: 8,
  border: "1px solid #ddd",
  color: "#1a1a2e",
  textDecoration: "none",
  fontSize: 13.5,
};
