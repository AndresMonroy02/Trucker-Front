import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";

import { api } from "../../api";
import Button from "../../components/Button";
import DashboardShell from "../../components/DashboardShell";
import ConfirmModal from "../../components/modals/ConfirmModal";
import VehicleFormModal from "../../components/modals/VehicleFormModal";
import TablePagination from "../../components/TablePagination";
import { getDashboardPathByRole } from "../../utils/roleRouting";

const INITIAL_FORM = {
  plate: "",
  model: "",
  year: "",
  status_id: "",
  driver_id: "",
};

const PAGE_SIZE = 8;

function formatDate(value) {
  if (!value) return "-";
  const dateValue = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value;
  const date = new Date(dateValue);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("es-CO");
}

export default function OwnerVehiclesPage({ token, me, onLogout, theme, onToggleTheme }) {
  const [vehicles, setVehicles] = useState([]);
  const [totalVehicles, setTotalVehicles] = useState(0);
  const [vehicleStatuses, setVehicleStatuses] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehiclePlate, setEditingVehiclePlate] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("active");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const totalPages = Math.max(1, Math.ceil(totalVehicles / PAGE_SIZE));
  const paginatedVehicles = useMemo(() => vehicles, [vehicles]);

  useEffect(() => {
    fetchVehicles(currentPage, statusFilter);
  }, [currentPage, statusFilter]);

  useEffect(() => {
    fetchVehicleStatuses();
  }, []);

  useEffect(() => {
    fetchActiveDrivers();
  }, []);

  const activeCount = useMemo(() => vehicles.filter((vehicle) => vehicle.status?.code === "active").length, [vehicles]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (me && me.role !== "owner_profile") {
    return <Navigate to={getDashboardPathByRole(me.role)} replace />;
  }

  async function fetchVehicles(page, statusValue) {
    try {
      const { data, headers } = await api.get("/owner/vehicles", {
        params: { page, page_size: PAGE_SIZE, status: statusValue },
      });
      setVehicles(data);
      setTotalVehicles(Number(headers["x-total-count"] || data.length));
    } catch (err) {
      toast.error(err.response?.data?.detail || "No fue posible cargar vehiculos.");
    }
  }

  async function fetchVehicleStatuses() {
    try {
      const { data } = await api.get("/owner/vehicle-statuses");
      setVehicleStatuses(data);
    } catch (err) {
      toast.error(err.response?.data?.detail || "No fue posible cargar los estados de vehiculo.");
    }
  }

  async function fetchActiveDrivers() {
    try {
      const { data } = await api.get("/owner/active-drivers");
      setDrivers(data);
    } catch (err) {
      toast.error(err.response?.data?.detail || "No fue posible cargar los conductores activos.");
    }
  }

  function handlePageChange(nextPage) {
    const safePage = Math.min(Math.max(nextPage, 1), totalPages);
    setCurrentPage(safePage);
  }

  function openModal() {
    setForm(INITIAL_FORM);
    setEditingVehiclePlate(null);
    setIsModalOpen(true);
  }

  function openEditModal(vehicle) {
    setForm({
      plate: vehicle.plate,
      model: vehicle.model,
      year: vehicle.year,
      status_id: String(vehicle.status_id),
      driver_id: vehicle.driver_id ? String(vehicle.driver_id) : "",
    });
    setEditingVehiclePlate(vehicle.plate);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingVehiclePlate(null);
  }

  function handleInputChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleStatusFilterChange(event) {
    setStatusFilter(event.target.value);
    setCurrentPage(1);
  }

  function clearFilters() {
    setStatusFilter("active");
    setCurrentPage(1);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.status_id) {
      toast.error("Selecciona un estado para el vehiculo.");
      return;
    }

    const payload = {
      ...form,
      status_id: Number(form.status_id),
      driver_id: form.driver_id ? Number(form.driver_id) : null,
    };

    try {
      if (editingVehiclePlate) {
        const { plate, ...updatePayload } = payload;
        await api.put(`/owner/vehicles/${encodeURIComponent(editingVehiclePlate)}`, updatePayload);
        toast.success("Vehiculo actualizado correctamente.");
        await fetchVehicles(currentPage, statusFilter);
      } else {
        await api.post("/owner/vehicles", payload);
        toast.success("Vehiculo creado correctamente.");
        if (currentPage !== 1) {
          setCurrentPage(1);
        } else {
          await fetchVehicles(1, statusFilter);
        }
      }
      closeModal();
    } catch (err) {
      toast.error(err.response?.data?.detail || "No fue posible crear el vehiculo.");
    }
  }

  function requestDelete(plate) {
    setDeleteTarget(plate);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await api.delete(`/owner/vehicles/${encodeURIComponent(deleteTarget)}`);
      toast.success("Vehiculo eliminado correctamente.");
      setDeleteTarget(null);
      closeModal();
      await fetchVehicles(currentPage, statusFilter);
    } catch (err) {
      toast.error(err.response?.data?.detail || "No fue posible eliminar el vehiculo.");
    }
  }

  return (
    <DashboardShell
      me={me}
      onLogout={onLogout}
      theme={theme}
      onToggleTheme={onToggleTheme}
      title="Vehiculos"
      subtitle="Administra tu flota para usarla al crear manifiestos"
    >
      <section className="panel owner-list-panel">
        <div className="owner-list-header">
          <div>
            <h3>Lista de vehiculos</h3>
            <p className="hint">Vehiculos activos (pagina actual): {activeCount} de {totalVehicles}</p>
          </div>
          <Button onClick={openModal}>Crear nuevo vehiculo</Button>
        </div>

        <div className="owner-filters-row">
          <div className="field">
            <label htmlFor="vehicle_status_filter">Estado</label>
            <select id="vehicle_status_filter" value={statusFilter} onChange={handleStatusFilterChange}>
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
                <th>Placa</th>
                <th>Modelo</th>
                <th>Ano</th>
                <th>Estado</th>
                <th>Conductor</th>
                <th>Creado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginatedVehicles.length === 0 && (
                <tr><td colSpan={7} className="hint">No hay vehiculos para los filtros seleccionados.</td></tr>
              )}
              {paginatedVehicles.map((vehicle) => (
                <tr key={vehicle.plate}>
                  <td>{vehicle.plate}</td>
                  <td>{vehicle.model}</td>
                  <td>{vehicle.year}</td>
                  <td>
                    <span className={`status-badge ${vehicle.status?.code === "active" ? "status-active" : "status-maintenance"}`}>
                      {vehicle.status?.label || "-"}
                    </span>
                  </td>
                  <td>{vehicle.driver?.name || vehicle.driver_name || "-"}</td>
                  <td>{formatDate(vehicle.created_at)}</td>
                  <td>
                    <button type="button" className="table-action-button" onClick={() => openEditModal(vehicle)}>
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <TablePagination
          page={currentPage}
          totalItems={totalVehicles}
          pageSize={PAGE_SIZE}
          onPageChange={handlePageChange}
          itemLabel="vehiculos"
        />
      </section>

      <VehicleFormModal
        isOpen={isModalOpen}
        form={form}
        vehicleStatuses={vehicleStatuses}
        drivers={drivers}
        onChange={handleInputChange}
        onSubmit={handleSubmit}
        onClose={closeModal}
        isEditing={Boolean(editingVehiclePlate)}
        onDelete={editingVehiclePlate ? () => requestDelete(editingVehiclePlate) : undefined}
      />

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Eliminar vehiculo"
        message="Esta seguro de eliminar este vehiculo? Podra seguir viendolo en el filtro de eliminados."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </DashboardShell>
  );
}
