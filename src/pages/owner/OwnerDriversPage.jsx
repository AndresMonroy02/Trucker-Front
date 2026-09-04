import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";

import { api } from "../../api";
import Button from "../../components/Button";
import DashboardShell from "../../components/DashboardShell";
import DriverFormModal from "../../components/modals/DriverFormModal";
import ConfirmModal from "../../components/modals/ConfirmModal";
import TablePagination from "../../components/TablePagination";
import { getDashboardPathByRole } from "../../utils/roleRouting";

const INITIAL_FORM = {
  name: "",
  license: "",
  phone: "",
  status_id: "",
  user_id: "",
};

const PAGE_SIZE = 8;

export default function OwnerDriversPage({ token, me, onLogout, theme, onToggleTheme }) {
  const [drivers, setDrivers] = useState([]);
  const [totalDrivers, setTotalDrivers] = useState(0);
  const [driverStatuses, setDriverStatuses] = useState([]);
  const [driverAccounts, setDriverAccounts] = useState([]);
  const [form, setForm] = useState(INITIAL_FORM);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDriverId, setEditingDriverId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("active");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const totalPages = Math.max(1, Math.ceil(totalDrivers / PAGE_SIZE));
  const paginatedDrivers = useMemo(() => drivers, [drivers]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (me && me.role !== "owner_profile") {
    return <Navigate to={getDashboardPathByRole(me.role)} replace />;
  }

  useEffect(() => {
    fetchDrivers(currentPage, statusFilter);
  }, [currentPage, statusFilter]);

  useEffect(() => {
    fetchDriverStatuses();
  }, []);

  async function fetchDrivers(page, statusValue) {
    try {
      const { data, headers } = await api.get("/owner/drivers", {
        params: { page, page_size: PAGE_SIZE, status: statusValue },
      });
      setDrivers(data);
      setTotalDrivers(Number(headers["x-total-count"] || data.length));
    } catch (err) {
      toast.error(err.response?.data?.detail || "No fue posible cargar conductores.");
    }
  }

  async function fetchDriverStatuses() {
    try {
      const { data } = await api.get("/owner/driver-statuses");
      setDriverStatuses(data);
    } catch (err) {
      toast.error(err.response?.data?.detail || "No fue posible cargar los estados de conductor.");
    }
  }

  async function fetchDriverAccounts() {
    try {
      const { data } = await api.get("/owner/driver-accounts");
      setDriverAccounts(data);
    } catch (err) {
      toast.error(err.response?.data?.detail || "No fue posible cargar las cuentas de conductor.");
    }
  }

  function openModal() {
    setForm(INITIAL_FORM);
    setEditingDriverId(null);
    fetchDriverAccounts();
    setIsModalOpen(true);
  }

  function openEditModal(driver) {
    setForm({
      name: driver.name,
      license: driver.license,
      phone: driver.phone,
      status_id: String(driver.status_id),
      user_id: driver.user_id ? String(driver.user_id) : "",
    });
    setEditingDriverId(driver.id);
    fetchDriverAccounts();
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingDriverId(null);
  }

  function handlePageChange(nextPage) {
    const safePage = Math.min(Math.max(nextPage, 1), totalPages);
    setCurrentPage(safePage);
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

    const name = form.name.trim();
    const license = form.license.trim();
    const phone = form.phone.trim();

    if (!name || !license || !phone || !form.status_id) {
      toast.error("Nombre, licencia, telefono y estado son obligatorios.");
      return;
    }

    try {
      const payload = {
        name,
        license,
        phone,
        status_id: Number(form.status_id),
        user_id: form.user_id ? Number(form.user_id) : null,
      };
      if (editingDriverId) {
        await api.put(`/owner/drivers/${editingDriverId}`, payload);
        toast.success("Conductor actualizado correctamente.");
        await fetchDrivers(currentPage, statusFilter);
      } else {
        await api.post("/owner/drivers", payload);
        toast.success("Conductor creado correctamente.");
        if (currentPage !== 1) {
          setCurrentPage(1);
        } else {
          await fetchDrivers(1, statusFilter);
        }
      }
      closeModal();
    } catch (err) {
      toast.error(err.response?.data?.detail || "No fue posible crear el conductor.");
    }
  }

  function requestDelete(driverId) {
    setDeleteTarget(driverId);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await api.delete(`/owner/drivers/${deleteTarget}`);
      toast.success("Conductor eliminado correctamente.");
      setDeleteTarget(null);
      closeModal();
      await fetchDrivers(currentPage, statusFilter);
    } catch (err) {
      toast.error(err.response?.data?.detail || "No fue posible eliminar el conductor.");
    }
  }

  return (
    <DashboardShell
      me={me}
      onLogout={onLogout}
      theme={theme}
      onToggleTheme={onToggleTheme}
      title="Conductores"
      subtitle="Crea y administra tus conductores"
    >
      <section className="panel owner-list-panel">
        <div className="owner-list-header">
          <div>
            <h3>Lista de conductores</h3>
            <p className="hint">Total registrados: {totalDrivers}</p>
          </div>
          <Button onClick={openModal}>Crear nuevo conductor</Button>
        </div>

        <div className="owner-filters-row">
          <div className="field">
            <label htmlFor="driver_status_filter">Estado</label>
            <select id="driver_status_filter" value={statusFilter} onChange={handleStatusFilterChange}>
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
                <th>Nombre</th>
                <th>Licencia</th>
                <th>Telefono</th>
                <th>Estado</th>
                <th>Cuenta</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginatedDrivers.length === 0 && (
                <tr><td colSpan={6} className="hint">No hay conductores para los filtros seleccionados.</td></tr>
              )}
              {paginatedDrivers.map((driver) => (
                <tr key={driver.id}>
                  <td>{driver.name}</td>
                  <td>{driver.license}</td>
                  <td>{driver.phone}</td>
                  <td>
                    <span className={`status-badge ${driver.status?.code === "available" ? "status-active" : "status-maintenance"}`}>
                      {driver.status?.label || "-"}
                    </span>
                  </td>
                  <td>{driver.user_id ? "Vinculada" : "Sin cuenta"}</td>
                  <td>
                    <button type="button" className="table-action-button" onClick={() => openEditModal(driver)}>
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
          totalItems={totalDrivers}
          pageSize={PAGE_SIZE}
          onPageChange={handlePageChange}
          itemLabel="conductores"
        />
      </section>

      <DriverFormModal
        isOpen={isModalOpen}
        form={form}
        driverStatuses={driverStatuses}
        driverAccounts={driverAccounts}
        onChange={handleInputChange}
        onSubmit={handleSubmit}
        onClose={closeModal}
        isEditing={Boolean(editingDriverId)}
        onDelete={editingDriverId ? () => requestDelete(editingDriverId) : undefined}
      />

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Eliminar conductor"
        message="Esta seguro de eliminar este conductor? Podra seguir viendolo en el filtro de eliminados."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </DashboardShell>
  );
}

