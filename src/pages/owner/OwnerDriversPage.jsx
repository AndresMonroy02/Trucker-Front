import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";

import { api } from "../../api";
import Button from "../../components/Button";
import DashboardShell from "../../components/DashboardShell";
import DriverFormModal from "../../components/modals/DriverFormModal";
import TablePagination from "../../components/TablePagination";
import { getDashboardPathByRole } from "../../utils/roleRouting";

const INITIAL_FORM = {
  name: "",
  license: "",
  phone: "",
  status_id: "",
};

const PAGE_SIZE = 8;

export default function OwnerDriversPage({ token, me, onLogout, theme, onToggleTheme }) {
  const [drivers, setDrivers] = useState([]);
  const [totalDrivers, setTotalDrivers] = useState(0);
  const [driverStatuses, setDriverStatuses] = useState([]);
  const [form, setForm] = useState(INITIAL_FORM);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(totalDrivers / PAGE_SIZE));
  const paginatedDrivers = useMemo(() => drivers, [drivers]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (me && me.role !== "owner_profile") {
    return <Navigate to={getDashboardPathByRole(me.role)} replace />;
  }

  useEffect(() => {
    fetchDrivers(currentPage);
  }, [currentPage]);

  useEffect(() => {
    fetchDriverStatuses();
  }, []);

  async function fetchDrivers(page) {
    try {
      const { data, headers } = await api.get("/owner/drivers", {
        params: { page, page_size: PAGE_SIZE },
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

  function openModal() {
    setForm(INITIAL_FORM);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
  }

  function handlePageChange(nextPage) {
    const safePage = Math.min(Math.max(nextPage, 1), totalPages);
    setCurrentPage(safePage);
  }

  function handleInputChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
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
      await api.post("/owner/drivers", { name, license, phone, status_id: Number(form.status_id) });
      if (currentPage !== 1) {
        setCurrentPage(1);
      } else {
        await fetchDrivers(1);
      }
      toast.success("Conductor creado correctamente.");
      closeModal();
    } catch (err) {
      toast.error(err.response?.data?.detail || "No fue posible crear el conductor.");
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

        <div className="owner-table-wrap">
          <table className="owner-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Licencia</th>
                <th>Telefono</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
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
        onChange={handleInputChange}
        onSubmit={handleSubmit}
        onClose={closeModal}
      />
    </DashboardShell>
  );
}

