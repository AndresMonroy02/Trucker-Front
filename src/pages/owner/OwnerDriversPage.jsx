import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";

import Button from "../../components/Button";
import DashboardShell from "../../components/DashboardShell";
import TablePagination from "../../components/TablePagination";
import { getDashboardPathByRole } from "../../utils/roleRouting";

const INITIAL_FORM = {
  name: "",
  license: "",
  phone: "",
  status: "available",
};

const INITIAL_DRIVERS = [
  { id: 1, name: "Carlos Mendoza", license: "LIC-2201", phone: "+57 300 555 2190", status: "available" },
  { id: 2, name: "Lucia Herrera", license: "LIC-1940", phone: "+57 300 555 1415", status: "on_trip" },
  { id: 3, name: "Mateo Salinas", license: "LIC-3110", phone: "+57 300 555 4872", status: "available" },
];

const PAGE_SIZE = 8;

export default function OwnerDriversPage({ token, me, onLogout, theme, onToggleTheme }) {
  const [drivers, setDrivers] = useState(INITIAL_DRIVERS);
  const [form, setForm] = useState(INITIAL_FORM);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(drivers.length / PAGE_SIZE));
  const paginatedDrivers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return drivers.slice(start, start + PAGE_SIZE);
  }, [drivers, currentPage]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (me && me.role !== "owner_profile") {
    return <Navigate to={getDashboardPathByRole(me.role)} replace />;
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

  function handleSubmit(event) {
    event.preventDefault();

    const nextDriver = {
      id: Date.now(),
      name: form.name.trim(),
      license: form.license.trim(),
      phone: form.phone.trim(),
      status: form.status,
    };

    if (!nextDriver.name || !nextDriver.license || !nextDriver.phone) {
      return;
    }

    setDrivers((prev) => [nextDriver, ...prev]);
    closeModal();
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
            <p className="hint">Total registrados: {drivers.length}</p>
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
                    <span className={`status-badge ${driver.status === "available" ? "status-active" : "status-maintenance"}`}>
                      {driver.status === "available" ? "Disponible" : "En ruta"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <TablePagination
          page={currentPage}
          totalItems={drivers.length}
          pageSize={PAGE_SIZE}
          onPageChange={handlePageChange}
          itemLabel="conductores"
        />
      </section>

      {isModalOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={closeModal}>
          <section
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-label="Crear nuevo conductor"
            onClick={(event) => event.stopPropagation()}
          >
            <h3>Nuevo conductor</h3>
            <form className="owner-form" onSubmit={handleSubmit}>
              <div className="field">
                <label htmlFor="name">Nombre completo</label>
                <input id="name" name="name" value={form.name} onChange={handleInputChange} required />
              </div>

              <div className="field">
                <label htmlFor="license">Licencia</label>
                <input id="license" name="license" value={form.license} onChange={handleInputChange} required />
              </div>

              <div className="field">
                <label htmlFor="phone">Telefono</label>
                <input id="phone" name="phone" value={form.phone} onChange={handleInputChange} required />
              </div>

              <div className="field">
                <label htmlFor="status">Estado</label>
                <select id="status" name="status" value={form.status} onChange={handleInputChange}>
                  <option value="available">Disponible</option>
                  <option value="on_trip">En ruta</option>
                </select>
              </div>

              <div className="actions-row">
                <Button type="submit">Guardar conductor</Button>
                <Button type="button" variant="cancel" onClick={closeModal}>Cancelar</Button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </DashboardShell>
  );
}
