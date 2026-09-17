import { useEffect, useState } from "react";
import { toast } from "sonner";

import { IfCanEdit, useAccess } from "../../access";
import { api, getErrorMessage } from "../../api";
import Button from "../../components/Button";
import DashboardShell from "../../components/DashboardShell";
import TablePagination from "../../components/TablePagination";
import ConfirmModal from "../../components/modals/ConfirmModal";
import DocumentPreviewModal from "../../components/modals/DocumentPreviewModal";
import { formatDateTime, formatFileSize } from "../../utils/format";

const PAGE_SIZE = 10;

// Mirrors the `kind` values the backend writes. A row whose kind is not listed
// here still renders -- it just shows the raw code, which is better than hiding a
// document somebody generated.
const KIND_LABELS = {
  vehicle_maintenances: "Mantenimientos por vehiculo",
  vehicle_inventories: "Inventario por vehiculo",
};

const EMPTY_FILTERS = { kind: "", date_from: "", date_to: "", status: "active" };

export default function OwnerReportsPage({ me, onLogout, theme, onToggleTheme }) {
  const access = useAccess();
  const canEdit = access.canEdit("reports");

  const [reports, setReports] = useState([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [previewTarget, setPreviewTarget] = useState(null);

  useEffect(() => {
    fetchReports(currentPage, filters);
  }, [currentPage, filters]);

  async function fetchReports(page, activeFilters) {
    try {
      const { data, headers } = await api.get("/owner/reports", {
        params: {
          page,
          page_size: PAGE_SIZE,
          status: activeFilters.status,
          kind: activeFilters.kind || undefined,
          date_from: activeFilters.date_from || undefined,
          date_to: activeFilters.date_to || undefined,
        },
      });
      setReports(data);
      setTotal(Number(headers["x-total-count"] || data.length));
    } catch (err) {
      toast.error(getErrorMessage(err, "No fue posible cargar los reportes."));
    }
  }

  function handleFilterChange(event) {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setCurrentPage(1);
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
    setCurrentPage(1);
  }

  /** Signed links expire in minutes, so they are minted on open, not reused. */
  async function openPreview(report) {
    try {
      const { data } = await api.get(`/owner/reports/${report.id}`);
      if (!data.file) {
        toast.error("Este reporte ya no tiene archivo.");
        await fetchReports(currentPage, filters);
        return;
      }
      setPreviewTarget(data);
    } catch (err) {
      toast.error(getErrorMessage(err, "No fue posible abrir el reporte."));
    }
  }

  async function download(report) {
    try {
      const { data } = await api.get(`/owner/reports/${report.id}`);
      const url = data.file?.download_url || data.file?.url;
      if (!url) {
        toast.error("Este reporte ya no tiene archivo.");
        return;
      }
      // A real navigation: the signed URL already is the credential, and the
      // disposition that makes it save rather than open is signed into it.
      window.open(url, "_blank", "noopener");
    } catch (err) {
      toast.error(getErrorMessage(err, "No fue posible descargar el reporte."));
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await api.delete(`/owner/reports/${deleteTarget}`);
      toast.success("Reporte eliminado correctamente.");
      setDeleteTarget(null);
      await fetchReports(currentPage, filters);
    } catch (err) {
      toast.error(getErrorMessage(err, "No fue posible eliminar el reporte."));
    }
  }

  return (
    <DashboardShell
      me={me}
      onLogout={onLogout}
      theme={theme}
      onToggleTheme={onToggleTheme}
      title="Reportes"
      subtitle="Los documentos que el sistema ha generado"
    >
      <section className="panel owner-list-panel">
        <div className="owner-list-header">
          <div>
            <h3>Documentos generados</h3>
            <p className="hint">{total} documentos para los filtros seleccionados</p>
          </div>
        </div>

        <div className="owner-filters-row">
          <div className="field">
            <label htmlFor="report_filter_kind">Tipo</label>
            <select
              id="report_filter_kind"
              name="kind"
              value={filters.kind}
              onChange={handleFilterChange}
            >
              <option value="">Todos</option>
              {Object.entries(KIND_LABELS).map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="report_filter_from">Generado desde</label>
            <input
              id="report_filter_from"
              type="date"
              name="date_from"
              value={filters.date_from}
              max={filters.date_to || undefined}
              onChange={handleFilterChange}
            />
          </div>
          <div className="field">
            <label htmlFor="report_filter_to">Hasta</label>
            <input
              id="report_filter_to"
              type="date"
              name="date_to"
              value={filters.date_to}
              min={filters.date_from || undefined}
              onChange={handleFilterChange}
            />
          </div>
          <div className="field">
            <label htmlFor="report_filter_status">Estado</label>
            <select
              id="report_filter_status"
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
            >
              <option value="active">Activos</option>
              <option value="deleted">Eliminados</option>
              <option value="all">Todos</option>
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
                <th>Generado</th>
                <th>Tipo</th>
                <th>Documento</th>
                <th>Tamano</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {reports.length === 0 && (
                <tr>
                  <td colSpan={5} className="hint">
                    No hay reportes para los filtros seleccionados. Generalos desde las
                    pantallas de Mantenimientos o Inventarios.
                  </td>
                </tr>
              )}
              {reports.map((report) => (
                <tr key={report.id}>
                  <td>{formatDateTime(report.created_at)}</td>
                  <td>{KIND_LABELS[report.kind] || report.kind}</td>
                  <td>{report.title}</td>
                  <td>{formatFileSize(report.file?.size) || "-"}</td>
                  <td>
                    <div className="owner-row-actions">
                      <button
                        type="button"
                        className="table-action-button"
                        onClick={() => openPreview(report)}
                      >
                        Ver
                      </button>
                      <button
                        type="button"
                        className="table-action-button"
                        onClick={() => download(report)}
                      >
                        Descargar
                      </button>
                      <IfCanEdit screen="reports">
                        <button
                          type="button"
                          className="table-action-button"
                          onClick={() => setDeleteTarget(report.id)}
                        >
                          Eliminar
                        </button>
                      </IfCanEdit>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <TablePagination
          page={currentPage}
          totalItems={total}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
          itemLabel="reportes"
        />
      </section>

      <DocumentPreviewModal
        isOpen={Boolean(previewTarget)}
        document={previewTarget}
        file={previewTarget?.file}
        subtitle={previewTarget?.title}
        onClose={() => setPreviewTarget(null)}
      />

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Eliminar reporte"
        message="Esta seguro de eliminar este reporte? El archivo se borra del almacenamiento y no se puede recuperar."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </DashboardShell>
  );
}
