import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { fetchAuditLogs, getErrorMessage } from "../../api";
import { formatDateTime } from "../../utils/format";
import TablePagination from "../TablePagination";

const PAGE_SIZE = 8;

const ACTION_LABELS = {
  create: "Creo",
  update: "Edito",
  delete: "Elimino",
};

const ENTITY_LABELS = {
  manifest: "Manifiesto",
  expense: "Gasto",
  manifest_payment: "Pago",
  driver_advance: "Anticipo",
};

const ROLE_LABELS = {
  owner_profile: "Propietario",
  driver_profile: "Conductor",
  admin: "Administrador",
  user: "Usuario",
};

const FIELD_LABELS = {
  amount: "Monto",
  currency: "Moneda",
  description: "Descripcion",
  expense_date: "Fecha",
  payment_date: "Fecha",
  advance_date: "Fecha",
  payment_method_id: "Metodo de pago",
  paid_from_advance: "Pagado con anticipo",
  freight_value: "Valor del flete",
  status_id: "Estado",
  driver_id: "Conductor",
  vehicle_id: "Vehiculo",
  manifest_number: "Numero",
  origin: "Origen",
  destination: "Destino",
  deleted_at: "Eliminado",
  is_paid: "Pagado",
  notes: "Notas",
  reference_code: "Referencia",
  payer_name: "Quien pago",
  kind: "Movimiento",
};

function formatValue(value) {
  if (value === null || value === undefined || value === "") return "vacio";
  if (value === true) return "si";
  if (value === false) return "no";
  return String(value);
}

/** Who changed what on this trip's money records, and when. */
export default function ManifestAuditPanel({ manifestId, reloadKey = 0 }) {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const loadLogs = useCallback(async () => {
    if (!manifestId) return;
    try {
      // By manifest, not by entity: every audit row carries the trip it belongs
      // to, so this is the whole money story -- the trip, its gastos, its pagos
      // and its anticipos -- in one list.
      const { data, headers } = await fetchAuditLogs({
        manifest_id: manifestId,
        page,
        page_size: PAGE_SIZE,
      });
      setLogs(data);
      setTotal(Number(headers["x-total-count"] || data.length || 0));
    } catch (err) {
      toast.error(getErrorMessage(err, "No fue posible cargar el historial."));
    }
    // reloadKey is not read in the body: it is the page telling us something
    // changed, which is exactly what should send this query again.
  }, [manifestId, page, reloadKey]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  return (
    <article className="panel owner-list-panel">
      <div className="owner-list-header">
        <div>
          <h3>Historial de cambios</h3>
          <p className="hint">Quien modifico el viaje, sus gastos, pagos y anticipos</p>
        </div>
      </div>

      <div className="owner-table-wrap">
        <table className="owner-table owner-table-tight">
          <thead>
            <tr>
              <th>Cuando</th>
              <th>Quien</th>
              <th>Accion</th>
              <th>Cambios</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => {
              const changes = Object.entries(log.changes || {});
              return (
                <tr key={log.id}>
                  <td>{formatDateTime(log.created_at)}</td>
                  <td>
                    {log.actor_username || "Sistema"}
                    {log.actor_role ? (
                      <span className="audit-actor-role">{ROLE_LABELS[log.actor_role] || log.actor_role}</span>
                    ) : null}
                  </td>
                  <td>
                    {ACTION_LABELS[log.action] || log.action} {ENTITY_LABELS[log.entity_type] || log.entity_type}
                  </td>
                  <td>
                    {log.action === "update" && changes.length > 0 ? (
                      <ul className="audit-change-list">
                        {changes.map(([field, change]) => (
                          <li key={field}>
                            <strong>{FIELD_LABELS[field] || field}:</strong>{" "}
                            {formatValue(change.before)} &rarr; {formatValue(change.after)}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      log.summary || "-"
                    )}
                  </td>
                </tr>
              );
            })}
            {logs.length === 0 ? (
              <tr>
                <td colSpan={4}>Sin cambios registrados.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <TablePagination
        page={page}
        totalItems={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        itemLabel="cambios"
      />
    </article>
  );
}
