import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { IfCanEdit, useAccess } from "../../access";
import { api, getErrorMessage } from "../../api";
import Button from "../../components/Button";
import DashboardShell from "../../components/DashboardShell";
import TablePagination from "../../components/TablePagination";
import ConfirmModal from "../../components/modals/ConfirmModal";
import DocumentPreviewModal from "../../components/modals/DocumentPreviewModal";
import InventoryFormModal from "../../components/modals/InventoryFormModal";
import ReportPickerModal from "../../components/modals/ReportPickerModal";
import VehiclePapersOption from "../../components/VehiclePapersOption";
import { formatDate } from "../../utils/format";

const PAGE_SIZE = 8;

function emptyForm(today) {
  return { vehicle_id: "", name: "", description: "", inventory_date: today };
}

function todayIso() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

const EMPTY_FILTERS = { vehicle_id: "", date_from: "", date_to: "", status: "active" };

export default function OwnerInventoriesPage({ me, onLogout, theme, onToggleTheme }) {
  const access = useAccess();
  const canEdit = access.canEdit("inventories");

  // Arriving from a vehicle card pre-selects that truck.
  const [searchParams, setSearchParams] = useSearchParams();
  const vehicleFromUrl = searchParams.get("vehicle_id") || "";

  const [inventories, setInventories] = useState([]);
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
  // Same switch as the maintenance sheet: the document leaves the company more
  // often than not, and who drives the truck rarely needs to go with it.
  const [includeDriver, setIncludeDriver] = useState(true);
  // Which polizas go on the sheet. null means all of them, which is what the API
  // assumes and what the report did before there was anything to choose.
  const [documentIds, setDocumentIds] = useState(null);

  useEffect(() => {
    fetchInventories(currentPage, filters);
  }, [currentPage, filters]);

  useEffect(() => {
    fetchVehicles();
  }, []);

  async function fetchInventories(page, activeFilters) {
    try {
      const { data, headers } = await api.get("/owner/inventories", {
        params: {
          page,
          page_size: PAGE_SIZE,
          status: activeFilters.status,
          vehicle_id: activeFilters.vehicle_id || undefined,
          date_from: activeFilters.date_from || undefined,
          date_to: activeFilters.date_to || undefined,
        },
      });
      setInventories(data);
      setTotal(Number(headers["x-total-count"] || data.length));
    } catch (err) {
      toast.error(getErrorMessage(err, "No fue posible cargar inventarios."));
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
      inventory_date: row.inventory_date,
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

  async function uploadFile(inventoryId, selected) {
    const payload = new FormData();
    payload.append("file", selected);
    setIsUploading(true);
    try {
      const { data } = await api.post(`/owner/inventories/${inventoryId}/file`, payload, {
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
      await api.delete(`/owner/inventories/${editingId}/file`);
      setEditingFile(null);
      toast.success("Archivo eliminado.");
      await fetchInventories(currentPage, filters);
    } catch (err) {
      toast.error(getErrorMessage(err, "No fue posible eliminar el archivo."));
    }
  }

  /** Signed links expire in minutes, so they are minted on open, not reused. */
  async function openPreview(row) {
    try {
      const { data } = await api.get(`/owner/inventories/${row.id}`);
      if (!data.file) {
        toast.error("Este inventario ya no tiene foto adjunta.");
        await fetchInventories(currentPage, filters);
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
   * Always the active ones, whatever the status filter is set to: an inventory
   * sheet says what the truck carries, and something that was removed is exactly
   * what it no longer carries. The API refuses a deleted id for the same reason.
   */
  async function openReportPicker() {
    if (!filters.vehicle_id) {
      toast.error("Selecciona un vehiculo para generar el reporte.");
      return;
    }
    try {
      const { data } = await api.get("/owner/inventories", {
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
      setIncludeDriver(true);
      setDocumentIds(null);
      setIsReportOpen(true);
    } catch (err) {
      toast.error(getErrorMessage(err, "No fue posible cargar los inventarios."));
    }
  }

  /**
   * Generate the document and keep it.
   *
   * No blob: the API stores the PDF and hands back a row whose signed link an
   * anchor can follow, which is how every other file in this app is downloaded.
   */
  async function generateReport(inventoryIds) {
    setIsGenerating(true);
    try {
      const { data } = await api.post("/owner/reports/inventories", {
        vehicle_id: Number(filters.vehicle_id),
        date_from: filters.date_from || null,
        date_to: filters.date_to || null,
        inventory_ids: inventoryIds,
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
    const payload = {
      vehicle_id: Number(form.vehicle_id),
      name: form.name,
      description: form.description || null,
      inventory_date: form.inventory_date,
    };
    try {
      if (editingId) {
        await api.put(`/owner/inventories/${editingId}`, payload);
        toast.success("Inventario actualizado correctamente.");
        await fetchInventories(currentPage, filters);
      } else {
        const { data: created } = await api.post("/owner/inventories", payload);
        // The row exists either way. If the upload then fails it is still there
        // and keeps the staged file, so the modal stays open for a retry rather
        // than the file vanishing without a word.
        if (pendingFile) {
          const uploaded = await uploadFile(created.id, pendingFile);
          if (!uploaded) {
            setEditingId(created.id);
            await fetchInventories(1, filters);
            toast.error("El inventario se guardo, pero el archivo no. Intenta adjuntarlo de nuevo.");
            return;
          }
        }
        toast.success("Inventario creado correctamente.");
        if (currentPage !== 1) setCurrentPage(1);
        else await fetchInventories(1, filters);
      }
      closeModal();
    } catch (err) {
      toast.error(getErrorMessage(err, "No fue posible guardar el inventario."));
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await api.delete(`/owner/inventories/${deleteTarget}`);
      toast.success("Inventario eliminado correctamente.");
      setDeleteTarget(null);
      closeModal();
      await fetchInventories(currentPage, filters);
    } catch (err) {
      toast.error(getErrorMessage(err, "No fue posible eliminar el inventario."));
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
      title="Inventarios"
      subtitle="Lo que cada vehiculo lleva instalado o a bordo"
    >
      <section className="panel owner-list-panel">
        <div className="owner-list-header">
          <div>
            <h3>Lista de inventarios</h3>
            <p className="hint">{total} registros para los filtros seleccionados</p>
          </div>
          <IfCanEdit screen="inventories">
            <Button onClick={openModal}>Registrar inventario</Button>
          </IfCanEdit>
        </div>

        <div className="owner-filters-row">
          <div className="field">
            <label htmlFor="inventory_filter_vehicle">Vehiculo</label>
            <select
              id="inventory_filter_vehicle"
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
            <label htmlFor="inventory_filter_from">Desde</label>
            <input
              id="inventory_filter_from"
              type="date"
              name="date_from"
              value={filters.date_from}
              max={filters.date_to || undefined}
              onChange={handleFilterChange}
            />
          </div>
          <div className="field">
            <label htmlFor="inventory_filter_to">Hasta</label>
            <input
              id="inventory_filter_to"
              type="date"
              name="date_to"
              value={filters.date_to}
              min={filters.date_from || undefined}
              onChange={handleFilterChange}
            />
          </div>
          <div className="field">
            <label htmlFor="inventory_filter_status">Estado</label>
            <select
              id="inventory_filter_status"
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
                ? "Elegi que elementos entran en el documento"
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
                <th>Foto</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {inventories.length === 0 && (
                <tr>
                  <td colSpan={6} className="hint">
                    No hay inventarios para los filtros seleccionados.
                  </td>
                </tr>
              )}
              {inventories.map((row) => (
                <tr key={row.id}>
                  <td>{formatDate(row.inventory_date)}</td>
                  <td>{row.vehicle_plate || "-"}</td>
                  <td>{row.name}</td>
                  <td>{row.description || "-"}</td>
                  <td>
                    {row.file ? (
                      <button
                        type="button"
                        className="table-action-button"
                        onClick={() => openPreview(row)}
                      >
                        Ver foto
                      </button>
                    ) : (
                      <span className="hint">-</span>
                    )}
                  </td>
                  <td>
                    {canEdit ? (
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
          itemLabel="inventarios"
        />
      </section>

      <ReportPickerModal
        isOpen={isReportOpen}
        title="Generar reporte de inventario"
        subtitle={reportSubtitle}
        rows={reportRows}
        columns={[
          { header: "Fecha", render: (row) => formatDate(row.inventory_date) },
          { header: "Nombre", render: (row) => row.name },
          { header: "Descripcion", render: (row) => row.description || "-" },
        ]}
        emptyMessage="No hay inventarios activos para los filtros seleccionados. Ajusta el filtro y vuelve a intentarlo."
        options={
          <>
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

      <InventoryFormModal
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
        title="Eliminar inventario"
        message="Esta seguro de eliminar este inventario? Podra seguir viendolo en el filtro de eliminados."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </DashboardShell>
  );
}
