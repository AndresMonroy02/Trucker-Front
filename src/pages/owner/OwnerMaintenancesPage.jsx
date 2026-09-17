import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { IfCanEdit, useAccess } from "../../access";
import { api, getErrorMessage } from "../../api";
import Button from "../../components/Button";
import DashboardShell from "../../components/DashboardShell";
import TablePagination from "../../components/TablePagination";
import ConfirmModal from "../../components/modals/ConfirmModal";
import DocumentPreviewModal from "../../components/modals/DocumentPreviewModal";
import MaintenanceFormModal from "../../components/modals/MaintenanceFormModal";
import ReportPickerModal from "../../components/modals/ReportPickerModal";
import VehiclePapersOption from "../../components/VehiclePapersOption";
import { formatDate, formatMoney } from "../../utils/format";

const PAGE_SIZE = 8;

function emptyForm(today) {
  return {
    vehicle_id: "",
    name: "",
    description: "",
    maintenance_date: today,
    amount: "",
    currency: "COP",
  };
}

function todayIso() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

const EMPTY_FILTERS = { vehicle_id: "", date_from: "", date_to: "", status: "active" };

export default function OwnerMaintenancesPage({ me, onLogout, theme, onToggleTheme }) {
  const access = useAccess();
  const canEdit = access.canEdit("maintenances");

  // Arriving from a vehicle card pre-selects that truck.
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const vehicleFromUrl = searchParams.get("vehicle_id") || "";

  const [maintenances, setMaintenances] = useState([]);
  const [total, setTotal] = useState(0);
  const [vehicles, setVehicles] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({ ...EMPTY_FILTERS, vehicle_id: vehicleFromUrl });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(() => emptyForm(todayIso()));
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [editingFile, setEditingFile] = useState(null);
  // Chosen before the row exists; uploaded the moment it does.
  const [pendingFile, setPendingFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewTarget, setPreviewTarget] = useState(null);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportRows, setReportRows] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  // The same history goes to a workshop, a buyer and an insurer, and only some of
  // them have any business seeing what the work cost. On by default: that is what
  // the button did before the question existed.
  const [includeAmounts, setIncludeAmounts] = useState(true);
  // Who drives the truck is not a workshop's business, nor a buyer's. On by
  // default, because inside the company it is useful and it was always there.
  const [includeDriver, setIncludeDriver] = useState(true);
  // Which polizas go on the sheet. null means all of them, which is what the API
  // assumes and what the report did before there was anything to choose.
  const [documentIds, setDocumentIds] = useState(null);

  useEffect(() => {
    fetchMaintenances(currentPage, filters);
  }, [currentPage, filters]);

  useEffect(() => {
    fetchVehicles();
  }, []);

  async function fetchMaintenances(page, activeFilters) {
    try {
      const { data, headers } = await api.get("/owner/maintenances", {
        params: {
          page,
          page_size: PAGE_SIZE,
          status: activeFilters.status,
          vehicle_id: activeFilters.vehicle_id || undefined,
          date_from: activeFilters.date_from || undefined,
          date_to: activeFilters.date_to || undefined,
        },
      });
      setMaintenances(data);
      setTotal(Number(headers["x-total-count"] || data.length));
    } catch (err) {
      toast.error(getErrorMessage(err, "No fue posible cargar mantenimientos."));
    }
  }

  async function fetchVehicles() {
    try {
      const { data } = await api.get("/owner/vehicles", {
        params: { page: 1, page_size: 100, status: "active" },
      });
      setVehicles(data);
    } catch (err) {
      toast.error(getErrorMessage(err, "No fue posible cargar vehiculos."));
    }
  }

  function handleFilterChange(event) {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setCurrentPage(1);
    if (name === "vehicle_id") {
      // Keep the URL honest, so the filter survives a reload or a shared link.
      setSearchParams(value ? { vehicle_id: value } : {}, { replace: true });
    }
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
    setCurrentPage(1);
    setSearchParams({}, { replace: true });
  }

  function handleInputChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function openModal() {
    setForm({ ...emptyForm(todayIso()), vehicle_id: filters.vehicle_id });
    setEditingId(null);
    setEditingFile(null);
    setPendingFile(null);
    setIsModalOpen(true);
  }

  function openEditModal(row) {
    setForm({
      vehicle_id: String(row.vehicle_id),
      name: row.name,
      description: row.description || "",
      maintenance_date: row.maintenance_date,
      // MoneyInput keeps a digit string; the API sends a decimal.
      amount: String(row.amount ?? "").split(".")[0],
      currency: row.currency || "COP",
    });
    setEditingId(row.id);
    setEditingFile(row.file);
    setPendingFile(null);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingId(null);
    setEditingFile(null);
    setPendingFile(null);
  }

  async function uploadFile(maintenanceId, selected) {
    const payload = new FormData();
    payload.append("file", selected);
    setIsUploading(true);
    try {
      const { data } = await api.post(`/owner/maintenances/${maintenanceId}/file`, payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setEditingFile(data);
      setPendingFile(null);
      return true;
    } catch (err) {
      toast.error(getErrorMessage(err, "No fue posible adjuntar el archivo."));
      return false;
    } finally {
      setIsUploading(false);
    }
  }

  async function handleFileChange(event) {
    const [selected] = event.target.files || [];
    // Clear the input either way, so re-picking the same file fires onChange again.
    event.target.value = "";
    if (!selected) return;
    // No row yet: hold it and send it the moment one exists.
    if (!editingId) {
      setPendingFile(selected);
      return;
    }
    await uploadFile(editingId, selected);
  }

  async function handleRemoveFile() {
    if (!editingId) return;
    try {
      await api.delete(`/owner/maintenances/${editingId}/file`);
      setEditingFile(null);
      toast.success("Archivo eliminado.");
      await fetchMaintenances(currentPage, filters);
    } catch (err) {
      toast.error(getErrorMessage(err, "No fue posible eliminar el archivo."));
    }
  }

  /** Signed links expire in minutes, so they are minted on open, not reused. */
  async function openPreview(row) {
    try {
      const { data } = await api.get(`/owner/maintenances/${row.id}`);
      if (!data.file) {
        toast.error("Este mantenimiento ya no tiene archivo adjunto.");
        await fetchMaintenances(currentPage, filters);
        return;
      }
      setPreviewTarget({ document: data, file: data.file });
    } catch (err) {
      toast.error(getErrorMessage(err, "No fue posible abrir el archivo."));
    }
  }

  /**
   * Open the picker with the rows the current filter shows.
   *
   * Fetched fresh rather than reusing the paginated page: the report covers the
   * whole filtered set, not just the eight rows on screen.
   */
  async function openReportPicker() {
    if (!filters.vehicle_id) {
      toast.error("Selecciona un vehiculo para generar el reporte.");
      return;
    }
    try {
      const { data } = await api.get("/owner/maintenances", {
        params: {
          page: 1,
          page_size: 100,
          status: "active",
          vehicle_id: filters.vehicle_id,
          date_from: filters.date_from || undefined,
          date_to: filters.date_to || undefined,
        },
      });
      setReportRows(data);
      setIncludeAmounts(true);
      setIncludeDriver(true);
      setDocumentIds(null);
      setIsReportOpen(true);
    } catch (err) {
      toast.error(getErrorMessage(err, "No fue posible cargar los mantenimientos."));
    }
  }

  /**
   * Generate the document and keep it.
   *
   * No blob: the API stores the PDF and hands back a row whose signed link an
   * anchor can follow, which is how every other file in this app is downloaded.
   */
  async function generateReport(maintenanceIds) {
    setIsGenerating(true);
    try {
      const { data } = await api.post("/owner/reports/maintenances", {
        vehicle_id: Number(filters.vehicle_id),
        date_from: filters.date_from || null,
        date_to: filters.date_to || null,
        maintenance_ids: maintenanceIds,
        include_amounts: includeAmounts,
        include_driver: includeDriver,
        document_ids: documentIds,
      });
      setIsReportOpen(false);
      toast.success("Reporte generado. Lo encontraras en Reportes.");
      const url = data.file?.download_url || data.file?.url;
      if (url) window.open(url, "_blank", "noopener");
    } catch (err) {
      toast.error(getErrorMessage(err, "No fue posible generar el reporte."));
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.vehicle_id) {
      toast.error("Selecciona un vehiculo.");
      return;
    }
    if (!form.amount || Number(form.amount) <= 0) {
      toast.error("Indica el monto del mantenimiento.");
      return;
    }
    const payload = {
      vehicle_id: Number(form.vehicle_id),
      name: form.name,
      description: form.description || null,
      maintenance_date: form.maintenance_date,
      amount: form.amount,
      currency: form.currency,
    };
    try {
      if (editingId) {
        await api.put(`/owner/maintenances/${editingId}`, payload);
        toast.success("Mantenimiento actualizado correctamente.");
        await fetchMaintenances(currentPage, filters);
      } else {
        const { data: created } = await api.post("/owner/maintenances", payload);
        // The row exists either way. If the upload then fails it is still there
        // and keeps the staged file, so the modal stays open for a retry rather
        // than the file vanishing without a word.
        if (pendingFile) {
          const uploaded = await uploadFile(created.id, pendingFile);
          if (!uploaded) {
            setEditingId(created.id);
            await fetchMaintenances(1, filters);
            toast.error("El mantenimiento se guardo, pero el archivo no. Intenta adjuntarlo de nuevo.");
            return;
          }
        }
        toast.success("Mantenimiento creado correctamente.");
        if (currentPage !== 1) setCurrentPage(1);
        else await fetchMaintenances(1, filters);
      }
      closeModal();
    } catch (err) {
      toast.error(getErrorMessage(err, "No fue posible guardar el mantenimiento."));
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await api.delete(`/owner/maintenances/${deleteTarget}`);
      toast.success("Mantenimiento eliminado correctamente.");
      setDeleteTarget(null);
      closeModal();
      await fetchMaintenances(currentPage, filters);
    } catch (err) {
      toast.error(getErrorMessage(err, "No fue posible eliminar el mantenimiento."));
    }
  }

  const reportSubtitle = [
    vehicles.find((item) => String(item.id) === String(filters.vehicle_id))?.plate || "",
    filters.date_from || filters.date_to
      ? `${filters.date_from || "inicio"} a ${filters.date_to || "hoy"}`
      : "todos los registros",
  ].join(" · ");

  return (
    <DashboardShell
      me={me}
      onLogout={onLogout}
      theme={theme}
      onToggleTheme={onToggleTheme}
      title="Mantenimientos"
      subtitle="Trabajos hechos a cada vehiculo, y lo que costaron"
    >
      <section className="panel owner-list-panel">
        <div className="owner-list-header">
          <div>
            <h3>Lista de mantenimientos</h3>
            <p className="hint">{total} registros para los filtros seleccionados</p>
          </div>
          <IfCanEdit screen="maintenances">
            <Button onClick={openModal}>Registrar mantenimiento</Button>
          </IfCanEdit>
        </div>

        <div className="owner-filters-row">
          <div className="field">
            <label htmlFor="maintenance_filter_vehicle">Vehiculo</label>
            <select
              id="maintenance_filter_vehicle"
              name="vehicle_id"
              value={filters.vehicle_id}
              onChange={handleFilterChange}
            >
              <option value="">Todos</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.plate}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="maintenance_filter_from">Desde</label>
            <input
              id="maintenance_filter_from"
              type="date"
              name="date_from"
              value={filters.date_from}
              max={filters.date_to || undefined}
              onChange={handleFilterChange}
            />
          </div>
          <div className="field">
            <label htmlFor="maintenance_filter_to">Hasta</label>
            <input
              id="maintenance_filter_to"
              type="date"
              name="date_to"
              value={filters.date_to}
              min={filters.date_from || undefined}
              onChange={handleFilterChange}
            />
          </div>
          <div className="field">
            <label htmlFor="maintenance_filter_status">Estado</label>
            <select
              id="maintenance_filter_status"
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
          <Button
            type="button"
            onClick={openReportPicker}
            disabled={!filters.vehicle_id}
            title={
              filters.vehicle_id
                ? "Elegi que mantenimientos entran en el documento"
                : "Selecciona un vehiculo para generar el reporte"
            }
          >
            Generar reporte
          </Button>
        </div>

        <div className="owner-table-wrap">
          <table className="owner-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Vehiculo</th>
                <th>Nombre</th>
                <th>Descripcion</th>
                <th>Monto</th>
                <th>Archivo</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {maintenances.length === 0 && (
                <tr>
                  <td colSpan={7} className="hint">
                    No hay mantenimientos para los filtros seleccionados.
                  </td>
                </tr>
              )}
              {maintenances.map((row) => (
                <tr key={row.id}>
                  <td>{formatDate(row.maintenance_date)}</td>
                  <td>{row.vehicle_plate || "-"}</td>
                  <td>
                    {row.name}
                    {row.source === "trip_expense" && (
                      <span
                        className="status-badge status-badge-inline status-neutral"
                        title={`Registrado como gasto del manifiesto ${row.manifest_number || ""}`}
                      >
                        Del viaje
                      </span>
                    )}
                  </td>
                  <td>{row.description || "-"}</td>
                  <td>{formatMoney(row.amount, row.currency)}</td>
                  <td>
                    {row.file ? (
                      <button
                        type="button"
                        className="table-action-button"
                        onClick={() => openPreview(row)}
                      >
                        Ver archivo
                      </button>
                    ) : (
                      <span className="hint">-</span>
                    )}
                  </td>
                  <td>
                    {/* A trip-sourced row mirrors its expense, which owns the
                        figures. The API refuses an edit here, so offering the
                        button would only produce an error. */}
                    {row.source === "trip_expense" ? (
                      <button
                        type="button"
                        className="table-action-button"
                        onClick={() => navigate(`/dashboard/owner/routes/${row.manifest_id}`)}
                        title="Editalo desde el gasto del manifiesto"
                      >
                        Ver viaje
                      </button>
                    ) : canEdit ? (
                      <button
                        type="button"
                        className="table-action-button"
                        onClick={() => openEditModal(row)}
                      >
                        Editar
                      </button>
                    ) : (
                      <span className="hint">-</span>
                    )}
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
          itemLabel="mantenimientos"
        />
      </section>

      <MaintenanceFormModal
        isOpen={isModalOpen}
        form={form}
        vehicles={vehicles}
        onChange={handleInputChange}
        onSubmit={handleSubmit}
        onClose={closeModal}
        isEditing={Boolean(editingId)}
        onDelete={editingId ? () => setDeleteTarget(editingId) : undefined}
        file={editingFile}
        pendingFile={pendingFile}
        isUploading={isUploading}
        onFileChange={handleFileChange}
        onRemoveFile={editingFile ? handleRemoveFile : undefined}
        onClearPendingFile={() => setPendingFile(null)}
        onPreviewFile={
          editingFile && editingId ? () => openPreview({ id: editingId }) : undefined
        }
      />

      <ReportPickerModal
        isOpen={isReportOpen}
        title="Generar reporte de mantenimientos"
        subtitle={reportSubtitle}
        rows={reportRows}
        columns={[
          { header: "Fecha", render: (row) => formatDate(row.maintenance_date) },
          { header: "Nombre", render: (row) => row.name },
          { header: "Monto", render: (row) => formatMoney(row.amount, row.currency) },
        ]}
        emptyMessage="No hay mantenimientos para los filtros seleccionados. Ajusta el filtro y vuelve a intentarlo."
        options={
          <>
            <label className="owner-checkbox">
              <input
                type="checkbox"
                checked={includeAmounts}
                onChange={(event) => setIncludeAmounts(event.target.checked)}
              />
              Mostrar los montos en el documento
            </label>
            <label className="owner-checkbox">
              <input
                type="checkbox"
                checked={includeDriver}
                onChange={(event) => setIncludeDriver(event.target.checked)}
              />
              Mostrar los datos del conductor
            </label>
            <VehiclePapersOption
              isOpen={isReportOpen}
              vehicleId={filters.vehicle_id}
              value={documentIds}
              onChange={setDocumentIds}
            />
          </>
        }
        isGenerating={isGenerating}
        onGenerate={generateReport}
        onClose={() => setIsReportOpen(false)}
      />

      <DocumentPreviewModal
        isOpen={Boolean(previewTarget)}
        document={previewTarget?.document}
        file={previewTarget?.file}
        subtitle={
          previewTarget
            ? `${previewTarget.document.name} - ${previewTarget.document.vehicle_plate || "-"}`
            : undefined
        }
        onClose={() => setPreviewTarget(null)}
      />

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Eliminar mantenimiento"
        message="Esta seguro de eliminar este mantenimiento? Tambien se eliminara el gasto que genero. Podra seguir viendolo en el filtro de eliminados."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </DashboardShell>
  );
}
