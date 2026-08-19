import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";

import { api } from "../../api";
import Button from "../../components/Button";
import DashboardShell from "../../components/DashboardShell";
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
  const [form, setForm] = useState(INITIAL_FORM);
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(totalVehicles / PAGE_SIZE));
  const paginatedVehicles = useMemo(() => vehicles, [vehicles]);

  useEffect(() => {
    fetchVehicles(currentPage);
  }, [currentPage]);

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

  async function fetchVehicles(page) {
    try {
      const { data, headers } = await api.get("/owner/vehicles", {
        params: { page, page_size: PAGE_SIZE },
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
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
  }

  function handleInputChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
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
      await api.post("/owner/vehicles", payload);
      if (currentPage !== 1) {
        setCurrentPage(1);
      } else {
        await fetchVehicles(1);
      }
      toast.success("Vehiculo creado correctamente.");
      closeModal();
    } catch (err) {
      toast.error(err.response?.data?.detail || "No fue posible crear el vehiculo.");
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
              </tr>
            </thead>
            <tbody>
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

      {isModalOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={closeModal}>
          <section
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-label="Crear nuevo vehiculo"
            onClick={(event) => event.stopPropagation()}
          >
            <h3>Nuevo vehiculo</h3>
            <form className="owner-form" onSubmit={handleSubmit}>
              <div className="field">
                <label htmlFor="plate">Placa</label>
                <input id="plate" name="plate" value={form.plate} onChange={handleInputChange} required />
              </div>

              <div className="field">
                <label htmlFor="model">Modelo</label>
                <input id="model" name="model" value={form.model} onChange={handleInputChange} required />
              </div>

              <div className="owner-inline-fields">
                <div className="field">
                  <label htmlFor="year">Ano</label>
                  <input id="year" name="year" value={form.year} onChange={handleInputChange} required />
                </div>
                <div className="field">
                  <label htmlFor="status">Estado</label>
                  <select id="status" name="status_id" value={form.status_id} onChange={handleInputChange} required>
                    <option value="">Selecciona un estado</option>
                    {vehicleStatuses.map((vehicleStatus) => (
                      <option key={vehicleStatus.id} value={vehicleStatus.id}>
                        {vehicleStatus.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="field">
                <label htmlFor="driver_id">Conductor</label>
                <select id="driver_id" name="driver_id" value={form.driver_id} onChange={handleInputChange}>
                  <option value="">Sin conductor asignado</option>
                  {drivers.map((driver) => (
                    <option key={driver.id} value={driver.id}>
                      {driver.name} - {driver.license}
                    </option>
                  ))}
                </select>
              </div>

              <div className="actions-row">
                <Button type="submit">Guardar vehiculo</Button>
                <Button type="button" variant="cancel" onClick={closeModal}>Cancelar</Button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </DashboardShell>
  );
}
