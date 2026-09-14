import { useEffect, useState } from "react";
import { toast } from "sonner";

import { fetchEmailLogs, getErrorMessage } from "../../api";
import Button from "../../components/Button";
import DashboardShell from "../../components/DashboardShell";
import TablePagination from "../../components/TablePagination";
import { formatDateTime } from "../../utils/format";

const PAGE_SIZE = 10;

const EMAIL_TYPE_LABELS = {
  driver_invite: "Invitacion de conductor",
  account_activation: "Activacion de cuenta",
};

const STATE_BADGES = {
  used: { label: "Activado", className: "status-active" },
  pending: { label: "Pendiente", className: "status-pending" },
  expired: { label: "Vencido", className: "status-in-transit" },
  revoked: { label: "Reemplazado", className: "status-neutral" },
  failed: { label: "Fallido", className: "status-maintenance" },
  sent: { label: "Enviado", className: "status-active" },
};

function getStateBadge(state) {
  return STATE_BADGES[state] || { label: state || "-", className: "status-neutral" };
}

export default function OwnerEmailLogsPage({ token, me, onLogout, theme, onToggleTheme }) {
  const [logs, setLogs] = useState([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const totalPages = Math.max(1, Math.ceil(totalLogs / PAGE_SIZE));

  useEffect(() => {
    if (!token) return;
    loadLogs(currentPage, typeFilter, statusFilter);
  }, [token, currentPage, typeFilter, statusFilter]);

  async function loadLogs(page, emailType, status) {
    try {
      const { data, headers } = await fetchEmailLogs({
        page,
        page_size: PAGE_SIZE,
        email_type: emailType,
        status,
      });
      setLogs(data);
      setTotalLogs(Number(headers["x-total-count"] || data.length));
    } catch (err) {
      toast.error(getErrorMessage(err, "No fue posible cargar el historial de correos."));
    }
  }

  function handlePageChange(nextPage) {
    setCurrentPage(Math.min(Math.max(nextPage, 1), totalPages));
  }

  function handleTypeFilterChange(event) {
    setTypeFilter(event.target.value);
    setCurrentPage(1);
  }

  function handleStatusFilterChange(event) {
    setStatusFilter(event.target.value);
    setCurrentPage(1);
  }

  function clearFilters() {
    setTypeFilter("all");
    setStatusFilter("all");
    setCurrentPage(1);
  }

  return (
    <DashboardShell
      me={me}
      onLogout={onLogout}
      theme={theme}
      onToggleTheme={onToggleTheme}
      title="Correos"
      subtitle="Historial de invitaciones y activaciones"
    >
      <section className="panel owner-list-panel">
        <div className="owner-list-header">
          <div>
            <h3>Correos enviados</h3>
            <p className="hint">Total registrados: {totalLogs}</p>
          </div>
        </div>

        <div className="owner-filters-row">
          <div className="field">
            <label htmlFor="email_type_filter">Tipo</label>
            <select id="email_type_filter" value={typeFilter} onChange={handleTypeFilterChange}>
              <option value="all">Todos</option>
              <option value="driver_invite">Invitacion de conductor</option>
              <option value="account_activation">Activacion de cuenta</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="email_status_filter">Estado</label>
            <select id="email_status_filter" value={statusFilter} onChange={handleStatusFilterChange}>
              <option value="all">Todos</option>
              <option value="pending">Pendientes</option>
              <option value="used">Activados</option>
              <option value="expired">Vencidos</option>
              <option value="failed">Fallidos</option>
            </select>
          </div>
          <Button type="button" variant="secondary" onClick={clearFilters}>
            Limpiar filtros
          </Button>
        </div>

        <div className="owner-table-wrap">
          <table className="owner-table">
            <thead>
              <tr>
                <th>Enviado</th>
                <th>Destinatario</th>
                <th>Tipo</th>
                <th>Conductor</th>
                <th>Estado</th>
                <th>Activado</th>
                <th>Vence</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && (
                <tr>
                  <td colSpan={7} className="hint">
                    No hay correos para los filtros seleccionados.
                  </td>
                </tr>
              )}
              {logs.map((log) => {
                const badge = getStateBadge(log.state);
                return (
                  <tr key={log.id}>
                    <td>{formatDateTime(log.created_at)}</td>
                    <td>{log.to_email}</td>
                    <td>{EMAIL_TYPE_LABELS[log.email_type] || log.email_type}</td>
                    <td>{log.driver_name || "-"}</td>
                    <td>
                      <span className={`status-badge ${badge.className}`} title={log.error_message || ""}>
                        {badge.label}
                      </span>
                    </td>
                    <td>{formatDateTime(log.used_at)}</td>
                    <td>{formatDateTime(log.expires_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <TablePagination
          page={currentPage}
          totalItems={totalLogs}
          pageSize={PAGE_SIZE}
          onPageChange={handlePageChange}
          itemLabel="correos"
        />
      </section>
    </DashboardShell>
  );
}
