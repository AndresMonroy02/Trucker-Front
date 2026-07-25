import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import { api } from "../../api";
import Button from "../../components/Button";
import DashboardShell from "../../components/DashboardShell";
import TablePagination from "../../components/TablePagination";
import { getDashboardPathByRole } from "../../utils/roleRouting";

const EMPTY_MANIFEST_FORM = {
  manifest_number: "",
  origin: "",
  destination: "",
  departure_date: "",
  arrival_date: "",
  cargo_description: "",
  freight_value: "",
  vehicle_plate: "",
  driver_name: "",
  is_closed: false,
};

const EMPTY_EXPENSE_FORM = {
  manifest_id: "",
  supplier_id: "",
  expense_type: "fuel",
  description: "",
  amount: "",
  expense_date: "",
  payment_method: "",
  reference_code: "",
  location: "",
  is_paid: true,
  notes: "",
};

const MANIFEST_PAGE_SIZE = 8;
function formatMoney(value) {
  const parsed = Number(value || 0);
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(parsed) ? parsed : 0);
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(`${value}T00:00:00`).toLocaleDateString("es-CO");
}

export default function OwnerRoutesPage({ token, me, onLogout, theme, onToggleTheme }) {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState("all");
  const [manifests, setManifests] = useState([]);
  const [totalManifests, setTotalManifests] = useState(0);
  const [vehicles, setVehicles] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [manifestModalOpen, setManifestModalOpen] = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [manifestForm, setManifestForm] = useState(EMPTY_MANIFEST_FORM);
  const [expenseForm, setExpenseForm] = useState(EMPTY_EXPENSE_FORM);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [currentManifestPage, setCurrentManifestPage] = useState(1);

  useEffect(() => {
    fetchManifests(statusFilter, currentManifestPage);
  }, [statusFilter, currentManifestPage]);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const activeCount = useMemo(() => manifests.filter((item) => !item.is_closed).length, [manifests]);
  const closedCount = useMemo(() => manifests.filter((item) => item.is_closed).length, [manifests]);
  const manifestTotalPages = Math.max(1, Math.ceil(totalManifests / MANIFEST_PAGE_SIZE));
  const paginatedManifests = useMemo(() => manifests, [manifests]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (me && me.role !== "owner_profile") {
    return <Navigate to={getDashboardPathByRole(me.role)} replace />;
  }

  async function fetchManifests(status, page) {
    try {
      const { data, headers } = await api.get("/owner/manifests", {
        params: {
          status,
          page,
          page_size: MANIFEST_PAGE_SIZE,
        },
      });
      setManifests(data);
      setTotalManifests(Number(headers["x-total-count"] || data.length));
    } catch (err) {
      setErrorMessage(err.response?.data?.detail || "No fue posible cargar los manifiestos.");
    }
  }

  async function fetchSuppliers() {
    try {
      const { data } = await api.get("/owner/suppliers", {
        params: { page: 1, page_size: 100 },
      });
      setSuppliers(data);
    } catch (err) {
      setErrorMessage(err.response?.data?.detail || "No fue posible cargar proveedores.");
    }
  }

  async function fetchVehicles() {
    try {
      const { data } = await api.get("/owner/vehicles", {
        params: { page: 1, page_size: 100 },
      });
      setVehicles(data);
    } catch (err) {
      setErrorMessage(err.response?.data?.detail || "No fue posible cargar vehiculos.");
    }
  }

  function openManifestModal() {
    setManifestForm(EMPTY_MANIFEST_FORM);
    setManifestModalOpen(true);
  }

  function closeManifestModal() {
    setManifestModalOpen(false);
  }

  function openExpenseModal(manifestId) {
    setExpenseForm({ ...EMPTY_EXPENSE_FORM, manifest_id: String(manifestId) });
    setExpenseModalOpen(true);
  }

  function closeExpenseModal() {
    setExpenseModalOpen(false);
  }

  function handleManifestInput(event) {
    const { name, value, type, checked } = event.target;
    setManifestForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  }

  function handleExpenseInput(event) {
    const { name, value, type, checked } = event.target;
    setExpenseForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  }

  function handleManifestPageChange(nextPage) {
    const safePage = Math.min(Math.max(nextPage, 1), manifestTotalPages);
    setCurrentManifestPage(safePage);
  }

  function handleStatusFilterChange(event) {
    const nextStatus = event.target.value;
    setStatusFilter(nextStatus);
    setCurrentManifestPage(1);
  }

  async function submitManifest(event) {
    event.preventDefault();
    setSuccessMessage("");
    setErrorMessage("");

    const payload = {
      ...manifestForm,
      freight_value: manifestForm.freight_value ? Number(manifestForm.freight_value) : 0,
      arrival_date: manifestForm.arrival_date || null,
      cargo_description: manifestForm.cargo_description || null,
      vehicle_plate: manifestForm.vehicle_plate || null,
      driver_name: manifestForm.driver_name || null,
    };

    try {
      const { data } = await api.post("/owner/manifests", payload);
      setSuccessMessage("Manifiesto creado correctamente.");
      closeManifestModal();
      if (currentManifestPage !== 1) {
        setCurrentManifestPage(1);
      } else {
        await fetchManifests(statusFilter, 1);
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.detail || "No fue posible crear el manifiesto.");
    }
  }

  async function submitExpense(event) {
    event.preventDefault();
    setSuccessMessage("");
    setErrorMessage("");

    if (!expenseForm.manifest_id) {
      setErrorMessage("Selecciona un manifiesto para registrar el gasto.");
      return;
    }

    const manifestId = Number(expenseForm.manifest_id);
    const payload = {
      supplier_id: expenseForm.supplier_id ? Number(expenseForm.supplier_id) : null,
      expense_type: expenseForm.expense_type,
      description: expenseForm.description,
      amount: Number(expenseForm.amount),
      expense_date: expenseForm.expense_date,
      payment_method: expenseForm.payment_method || null,
      reference_code: expenseForm.reference_code || null,
      location: expenseForm.location || null,
      is_paid: expenseForm.is_paid,
      notes: expenseForm.notes || null,
    };

    try {
      await api.post(`/owner/manifests/${manifestId}/expenses`, payload);
      setSuccessMessage("Gasto registrado correctamente.");
      closeExpenseModal();
      setExpenseForm(EMPTY_EXPENSE_FORM);
      await fetchManifests(statusFilter, currentManifestPage);
    } catch (err) {
      setErrorMessage(err.response?.data?.detail || "No fue posible registrar el gasto.");
    }
  }

  return (
    <DashboardShell
      me={me}
      onLogout={onLogout}
      theme={theme}
      onToggleTheme={onToggleTheme}
      title="Manifiestos"
      subtitle="Gestiona rutas, crea gastos por ruta y consulta el detalle"
    >
      {successMessage ? <p className="success">{successMessage}</p> : null}
      {errorMessage ? <p className="error">{errorMessage}</p> : null}

      <section className="panel owner-list-panel">
        <div className="owner-list-header">
          <div>
            <h3>Manifiestos de ruta</h3>
            <p className="hint">Activos (pagina actual): {activeCount} | Cerrados (pagina actual): {closedCount} | Total: {totalManifests}</p>
          </div>
          <div className="actions-row">
            <select value={statusFilter} onChange={handleStatusFilterChange}>
              <option value="all">Todos</option>
              <option value="active">Activos</option>
              <option value="closed">Cerrados</option>
            </select>
            <Button onClick={openManifestModal}>Crear manifiesto</Button>
          </div>
        </div>

        <div className="owner-table-wrap">
          <table className="owner-table">
            <thead>
              <tr>
                <th>Manifiesto</th>
                <th>Ruta</th>
                <th>Vehiculo</th>
                <th>Salida</th>
                <th>Estado</th>
                <th>Flete</th>
                <th>Gastos</th>
                <th>Resultado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginatedManifests.map((manifest) => (
                <tr key={manifest.id}>
                  <td>{manifest.manifest_number}</td>
                  <td>{manifest.origin} - {manifest.destination}</td>
                  <td>{manifest.vehicle_plate || "-"}</td>
                  <td>{formatDate(manifest.departure_date)}</td>
                  <td>
                    <span className={`status-badge ${manifest.is_closed ? "status-maintenance" : "status-active"}`}>
                      {manifest.is_closed ? "Cerrada" : "Activa"}
                    </span>
                  </td>
                  <td>{formatMoney(manifest.freight_value)}</td>
                  <td>{formatMoney(manifest.total_expenses)}</td>
                  <td>{formatMoney(manifest.net_result)}</td>
                  <td>
                    <div className="owner-row-actions">
                      <Button type="button" variant="secondary" onClick={() => navigate(`/dashboard/owner/routes/${manifest.id}`)}>
                        Detalle
                      </Button>
                      <Button type="button" onClick={() => openExpenseModal(manifest.id)}>
                        Agregar gasto
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <TablePagination
          page={currentManifestPage}
          totalItems={totalManifests}
          pageSize={MANIFEST_PAGE_SIZE}
          onPageChange={handleManifestPageChange}
          itemLabel="manifiestos"
        />
      </section>

      {manifestModalOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={closeManifestModal}>
          <section
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-label="Crear manifiesto"
            onClick={(event) => event.stopPropagation()}
          >
            <h3>Nuevo manifiesto</h3>
            <form className="owner-form" onSubmit={submitManifest}>
              <div className="field">
                <label htmlFor="manifest_number">Numero de manifiesto</label>
                <input id="manifest_number" name="manifest_number" value={manifestForm.manifest_number} onChange={handleManifestInput} required />
              </div>

              <div className="owner-inline-fields">
                <div className="field">
                  <label htmlFor="origin">Origen</label>
                  <input id="origin" name="origin" value={manifestForm.origin} onChange={handleManifestInput} required />
                </div>
                <div className="field">
                  <label htmlFor="destination">Destino</label>
                  <input id="destination" name="destination" value={manifestForm.destination} onChange={handleManifestInput} required />
                </div>
              </div>

              <div className="owner-inline-fields">
                <div className="field">
                  <label htmlFor="departure_date">Fecha salida</label>
                  <input id="departure_date" name="departure_date" type="date" value={manifestForm.departure_date} onChange={handleManifestInput} required />
                </div>
                <div className="field">
                  <label htmlFor="arrival_date">Fecha llegada</label>
                  <input id="arrival_date" name="arrival_date" type="date" value={manifestForm.arrival_date} onChange={handleManifestInput} />
                </div>
              </div>

              <div className="owner-inline-fields">
                <div className="field">
                  <label htmlFor="vehicle_plate">Vehiculo</label>
                  <select id="vehicle_plate" name="vehicle_plate" value={manifestForm.vehicle_plate} onChange={handleManifestInput} required>
                    <option value="">Selecciona un vehiculo</option>
                    {vehicles.map((vehicle) => (
                      <option key={vehicle.plate} value={vehicle.plate}>
                        {vehicle.plate} - {vehicle.model}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="driver_name">Conductor</label>
                  <input id="driver_name" name="driver_name" value={manifestForm.driver_name} onChange={handleManifestInput} />
                </div>
              </div>

              <div className="field">
                <label htmlFor="freight_value">Valor del flete</label>
                <input id="freight_value" name="freight_value" type="number" min="0" step="0.01" value={manifestForm.freight_value} onChange={handleManifestInput} />
              </div>

              <div className="field">
                <label htmlFor="cargo_description">Descripcion de carga</label>
                <input id="cargo_description" name="cargo_description" value={manifestForm.cargo_description} onChange={handleManifestInput} />
              </div>

              <label className="owner-checkbox">
                <input name="is_closed" type="checkbox" checked={manifestForm.is_closed} onChange={handleManifestInput} />
                Crear como ruta cerrada
              </label>

              <div className="actions-row">
                <Button type="submit">Guardar manifiesto</Button>
                <Button type="button" variant="cancel" onClick={closeManifestModal}>Cancelar</Button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {expenseModalOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={closeExpenseModal}>
          <section
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-label="Registrar gasto"
            onClick={(event) => event.stopPropagation()}
          >
            <h3>Nuevo gasto</h3>
            <form className="owner-form" onSubmit={submitExpense}>
              <div className="field">
                <label htmlFor="expense_manifest_id">Manifiesto</label>
                <select id="expense_manifest_id" name="manifest_id" value={expenseForm.manifest_id} onChange={handleExpenseInput} required>
                  <option value="">Selecciona un manifiesto</option>
                  {manifests.map((manifest) => (
                    <option key={manifest.id} value={manifest.id}>
                      {manifest.manifest_number} ({manifest.is_closed ? "Cerrada" : "Activa"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="supplier_id">Proveedor (opcional)</label>
                <select id="supplier_id" name="supplier_id" value={expenseForm.supplier_id} onChange={handleExpenseInput}>
                  <option value="">Sin proveedor</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                  ))}
                </select>
              </div>

              <div className="owner-inline-fields">
                <div className="field">
                  <label htmlFor="expense_type">Tipo gasto</label>
                  <select id="expense_type" name="expense_type" value={expenseForm.expense_type} onChange={handleExpenseInput}>
                    <option value="fuel">Combustible</option>
                    <option value="toll">Peaje</option>
                    <option value="maintenance">Mantenimiento</option>
                    <option value="food">Alimentacion</option>
                    <option value="lodging">Hospedaje</option>
                    <option value="other">Otro</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="amount">Monto</label>
                  <input id="amount" name="amount" type="number" step="0.01" min="0.01" value={expenseForm.amount} onChange={handleExpenseInput} required />
                </div>
              </div>

              <div className="owner-inline-fields">
                <div className="field">
                  <label htmlFor="expense_date">Fecha gasto</label>
                  <input id="expense_date" name="expense_date" type="date" value={expenseForm.expense_date} onChange={handleExpenseInput} required />
                </div>
                <div className="field">
                  <label htmlFor="payment_method">Metodo pago</label>
                  <input id="payment_method" name="payment_method" value={expenseForm.payment_method} onChange={handleExpenseInput} />
                </div>
              </div>

              <div className="field">
                <label htmlFor="description">Descripcion</label>
                <input id="description" name="description" value={expenseForm.description} onChange={handleExpenseInput} required />
              </div>

              <div className="owner-inline-fields">
                <div className="field">
                  <label htmlFor="reference_code">Codigo referencia</label>
                  <input id="reference_code" name="reference_code" value={expenseForm.reference_code} onChange={handleExpenseInput} />
                </div>
                <div className="field">
                  <label htmlFor="location">Ubicacion</label>
                  <input id="location" name="location" value={expenseForm.location} onChange={handleExpenseInput} />
                </div>
              </div>

              <div className="field">
                <label htmlFor="notes">Notas</label>
                <input id="notes" name="notes" value={expenseForm.notes} onChange={handleExpenseInput} />
              </div>

              <label className="owner-checkbox">
                <input name="is_paid" type="checkbox" checked={expenseForm.is_paid} onChange={handleExpenseInput} />
                Gasto pagado
              </label>

              <div className="actions-row">
                <Button type="submit">Guardar gasto</Button>
                <Button type="button" variant="cancel" onClick={closeExpenseModal}>Cancelar</Button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </DashboardShell>
  );
}
