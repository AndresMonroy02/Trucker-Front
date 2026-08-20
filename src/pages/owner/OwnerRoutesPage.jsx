import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { api } from "../../api";
import Button from "../../components/Button";
import DashboardShell from "../../components/DashboardShell";
import ExpenseFormModal from "../../components/modals/ExpenseFormModal";
import ManifestFormModal from "../../components/modals/ManifestFormModal";
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
  driver_id: "",
  status_id: "",
};

const EMPTY_MANIFEST_FILTERS = {
  dateFrom: "",
  dateTo: "",
  statusIds: [],
  vehiclePlate: "",
  driverId: "",
};

const EMPTY_EXPENSE_FORM = {
  manifest_id: "",
  supplier_id: "",
  expense_type_id: "",
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

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getManifestStatusBadgeClass(code) {
  switch (code) {
    case "pending":
      return "status-pending";
    case "in_transit":
      return "status-in-transit";
    case "delivered":
      return "status-delivered";
    case "cancelled":
      return "status-cancelled";
    default:
      return "status-neutral";
  }
}

export default function OwnerRoutesPage({ token, me, onLogout, theme, onToggleTheme }) {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState("all");
  const [manifests, setManifests] = useState([]);
  const [totalManifests, setTotalManifests] = useState(0);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [expenseTypes, setExpenseTypes] = useState([]);
  const [manifestStatuses, setManifestStatuses] = useState([]);
  const [manifestModalOpen, setManifestModalOpen] = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const statusDropdownRef = useRef(null);
  const [manifestForm, setManifestForm] = useState(EMPTY_MANIFEST_FORM);
  const [editingManifestId, setEditingManifestId] = useState(null);
  const [manifestFilters, setManifestFilters] = useState(EMPTY_MANIFEST_FILTERS);
  const [expenseForm, setExpenseForm] = useState(EMPTY_EXPENSE_FORM);
  const [expenseForms, setExpenseForms] = useState([]);
  const [editingExpenseIndex, setEditingExpenseIndex] = useState(null);
  const [expenseManifestLocked, setExpenseManifestLocked] = useState(false);
  const [currentManifestPage, setCurrentManifestPage] = useState(1);

  useEffect(() => {
    fetchManifests(statusFilter, currentManifestPage);
  }, [statusFilter, currentManifestPage, manifestFilters]);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  useEffect(() => {
    fetchExpenseTypes();
  }, []);

  useEffect(() => {
    fetchManifestStatuses();
  }, []);

  useEffect(() => {
    fetchVehicles();
  }, []);

  useEffect(() => {
    fetchActiveDrivers();
  }, []);

  useEffect(() => {
    if (!statusDropdownOpen) return;

    function handlePointerDown(event) {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target)) {
        setStatusDropdownOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setStatusDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [statusDropdownOpen]);

  const safeManifestTotalPages = Math.max(1, Math.ceil(totalManifests / MANIFEST_PAGE_SIZE));

  const activeCount = useMemo(
    () => manifests.filter((item) => ["pending", "in_transit"].includes(item.status?.code)).length,
    [manifests],
  );
  const closedCount = useMemo(
    () => manifests.filter((item) => ["delivered", "cancelled"].includes(item.status?.code)).length,
    [manifests],
  );
  const paginatedManifests = useMemo(() => manifests, [manifests]);
  const selectedStatusLabels = useMemo(
    () =>
      manifestFilters.statusIds.length === 0
        ? ["Todos"]
        : manifestStatuses
            .filter((status) => manifestFilters.statusIds.includes(status.id))
            .map((status) => status.label),
    [manifestFilters.statusIds, manifestStatuses],
  );

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
          status_ids: manifestFilters.statusIds.length > 0 ? manifestFilters.statusIds : undefined,
          date_from: manifestFilters.dateFrom || undefined,
          date_to: manifestFilters.dateTo || undefined,
          vehicle_plate: manifestFilters.vehiclePlate || undefined,
          driver_id: manifestFilters.driverId || undefined,
        },
        paramsSerializer: { indexes: null },
      });
      setManifests(data);
      setTotalManifests(Number(headers["x-total-count"] || data.length));
    } catch (err) {
      toast.error(err.response?.data?.detail || "No fue posible cargar los manifiestos.");
    }
  }

  async function fetchSuppliers() {
    try {
      const { data } = await api.get("/owner/suppliers", {
        params: { page: 1, page_size: 100 },
      });
      setSuppliers(data);
    } catch (err) {
      toast.error(err.response?.data?.detail || "No fue posible cargar proveedores.");
    }
  }

  async function fetchVehicles() {
    try {
      const { data } = await api.get("/owner/vehicles", {
        params: { page: 1, page_size: 100 },
      });
      setVehicles(data);
    } catch (err) {
      toast.error(err.response?.data?.detail || "No fue posible cargar vehiculos.");
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

  async function fetchExpenseTypes() {
    try {
      const { data } = await api.get("/owner/expense-types");
      setExpenseTypes(data);
    } catch (err) {
      toast.error(err.response?.data?.detail || "No fue posible cargar los tipos de gasto.");
    }
  }

  async function fetchManifestStatuses() {
    try {
      const { data } = await api.get("/owner/manifest-statuses");
      setManifestStatuses(data);
    } catch (err) {
      toast.error(err.response?.data?.detail || "No fue posible cargar los estados de manifiesto.");
    }
  }

  function openManifestModal() {
    setManifestForm(EMPTY_MANIFEST_FORM);
    setEditingManifestId(null);
    setManifestModalOpen(true);
  }

  function openEditManifestModal(manifest) {
    setManifestForm({
      manifest_number: manifest.manifest_number,
      origin: manifest.origin,
      destination: manifest.destination,
      departure_date: manifest.departure_date,
      arrival_date: manifest.arrival_date || "",
      cargo_description: manifest.cargo_description || "",
      freight_value: manifest.freight_value,
      vehicle_plate: manifest.vehicle_plate || "",
      driver_id: manifest.driver_id || "",
      status_id: manifest.status_id,
    });
    setEditingManifestId(manifest.id);
    setManifestModalOpen(true);
  }

  function closeManifestModal() {
    setManifestModalOpen(false);
    setEditingManifestId(null);
  }

  function openExpenseModal(manifestId) {
    setExpenseForm({ ...EMPTY_EXPENSE_FORM, manifest_id: String(manifestId) });
    setExpenseForms([]);
    setEditingExpenseIndex(null);
    setExpenseManifestLocked(true);
    setExpenseModalOpen(true);
  }

  function closeExpenseModal() {
    setExpenseModalOpen(false);
    setExpenseManifestLocked(false);
  }

  function handleManifestInput(event) {
    const { name, value, type, checked } = event.target;
    setManifestForm((prev) => {
      if (name !== "driver_id") {
        return { ...prev, [name]: type === "checkbox" ? checked : value };
      }

      const assignedVehicle = vehicles.find((vehicle) => vehicle.driver_id === Number(value));
      return {
        ...prev,
        driver_id: value,
        vehicle_plate: assignedVehicle?.plate || prev.vehicle_plate,
      };
    });
  }

  function handleExpenseInput(event) {
    const { name, value, type, checked } = event.target;
    setExpenseForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  }

  function validateExpenseForm(form) {
    if (!form.manifest_id) {
      toast.error("Selecciona un manifiesto para registrar el gasto.");
      return false;
    }
    if (!form.expense_type_id || !form.description.trim() || !form.amount || Number(form.amount) <= 0 || !form.expense_date) {
      toast.error("Completa tipo, monto, fecha y descripcion del gasto.");
      return false;
    }
    return true;
  }

  function addExpenseForm() {
    if (!validateExpenseForm(expenseForm)) return;

    setExpenseForms((prev) => {
      if (editingExpenseIndex === null) return [...prev, expenseForm];
      return prev.map((item, index) => (index === editingExpenseIndex ? expenseForm : item));
    });
    setExpenseForm({ ...EMPTY_EXPENSE_FORM, manifest_id: expenseForm.manifest_id });
    setEditingExpenseIndex(null);
  }

  function editExpenseForm(index) {
    setExpenseForm(expenseForms[index]);
    setEditingExpenseIndex(index);
  }

  function removeExpenseForm(index) {
    setExpenseForms((prev) => prev.filter((_, formIndex) => formIndex !== index));
    if (editingExpenseIndex === index) {
      setExpenseForm({ ...EMPTY_EXPENSE_FORM, manifest_id: expenseForm.manifest_id });
      setEditingExpenseIndex(null);
    } else if (editingExpenseIndex !== null && editingExpenseIndex > index) {
      setEditingExpenseIndex((prev) => prev - 1);
    }
  }

  function handleManifestPageChange(nextPage) {
    const safePage = Math.min(Math.max(nextPage, 1), safeManifestTotalPages);
    setCurrentManifestPage(safePage);
  }

  function handleStatusFilterChange(event) {
    const nextStatus = event.target.value;
    setStatusFilter(nextStatus);
    setCurrentManifestPage(1);
  }

  function handleManifestFilterChange(event) {
    const { name, value } = event.target;
    setManifestFilters((prev) => ({ ...prev, [name]: value }));
    setCurrentManifestPage(1);
  }

  function handleManifestStatusFilterToggle(statusId) {
    const nextStatusIds = manifestFilters.statusIds.includes(statusId)
      ? manifestFilters.statusIds.filter((id) => id !== statusId)
      : [...manifestFilters.statusIds, statusId];

    setManifestFilters((prev) => ({ ...prev, statusIds: nextStatusIds }));
    setCurrentManifestPage(1);
  }

  function clearManifestFilters() {
    setManifestFilters(EMPTY_MANIFEST_FILTERS);
    setStatusDropdownOpen(false);
    setCurrentManifestPage(1);
  }

  async function submitManifest(event) {
    event.preventDefault();

    const payload = {
      ...manifestForm,
      freight_value: manifestForm.freight_value ? Number(manifestForm.freight_value) : 0,
      arrival_date: manifestForm.arrival_date || null,
      cargo_description: manifestForm.cargo_description || null,
      vehicle_plate: manifestForm.vehicle_plate || null,
      driver_id: manifestForm.driver_id ? Number(manifestForm.driver_id) : null,
      status_id: manifestForm.status_id ? Number(manifestForm.status_id) : null,
    };

    try {
      if (editingManifestId) {
        await api.put(`/owner/manifests/${editingManifestId}`, payload);
        toast.success("Manifiesto actualizado correctamente.");
      } else {
        await api.post("/owner/manifests", payload);
        toast.success("Manifiesto creado correctamente.");
      }
      closeManifestModal();
      if (currentManifestPage !== 1 && !editingManifestId) {
        setCurrentManifestPage(1);
      } else {
        await fetchManifests(statusFilter, currentManifestPage);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || `No fue posible ${editingManifestId ? "actualizar" : "crear"} el manifiesto.`);
    }
  }

  async function submitExpense(event) {
    event.preventDefault();

    let expensesToSubmit = expenseForms;
    if (editingExpenseIndex !== null) {
      if (!validateExpenseForm(expenseForm)) return;
      expensesToSubmit = expenseForms.map((item, index) => (index === editingExpenseIndex ? expenseForm : item));
    } else if (expenseForms.length === 0 || expenseForm.description || expenseForm.amount || expenseForm.expense_type_id || expenseForm.expense_date) {
      if (!validateExpenseForm(expenseForm)) return;
      expensesToSubmit = [...expenseForms, expenseForm];
    }

    const manifestId = Number((expensesToSubmit[0] || expenseForm).manifest_id);
    const payload = {
      expenses: expensesToSubmit.map((expenseForm) => ({
        supplier_id: expenseForm.supplier_id ? Number(expenseForm.supplier_id) : null,
        expense_type_id: Number(expenseForm.expense_type_id),
        description: expenseForm.description,
        amount: Number(expenseForm.amount),
        expense_date: expenseForm.expense_date,
        payment_method: expenseForm.payment_method || null,
        reference_code: expenseForm.reference_code || null,
        location: expenseForm.location || null,
        is_paid: expenseForm.is_paid,
        notes: expenseForm.notes || null,
      })),
    };

    try {
      await api.post(`/owner/manifests/${manifestId}/expenses/bulk`, payload);
      toast.success(`${expensesToSubmit.length} gasto(s) registrado(s) correctamente.`);
      closeExpenseModal();
      setExpenseForm(EMPTY_EXPENSE_FORM);
      setExpenseForms([]);
      setEditingExpenseIndex(null);
      await fetchManifests(statusFilter, currentManifestPage);
    } catch (err) {
      toast.error(err.response?.data?.detail || "No fue posible registrar el gasto.");
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
      <section className="panel owner-list-panel">
        <div className="owner-list-header">
          <div>
            <h3>Manifiestos de ruta</h3>
            <p className="hint">Activos (pagina actual): {activeCount} | Cerrados (pagina actual): {closedCount} | Total: {totalManifests}</p>
          </div>
          <div className="actions-row">
            <Button onClick={openManifestModal}>Crear manifiesto</Button>
          </div>
        </div>

        <div className="owner-filters-row">
          <div className="field">
            <label htmlFor="filter_date_from">Salida desde</label>
            <input
              id="filter_date_from"
              name="dateFrom"
              type="date"
              value={manifestFilters.dateFrom}
              onChange={handleManifestFilterChange}
            />
          </div>
          <div className="field">
            <label htmlFor="filter_date_to">Salida hasta</label>
            <input
              id="filter_date_to"
              name="dateTo"
              type="date"
              value={manifestFilters.dateTo}
              onChange={handleManifestFilterChange}
            />
          </div>
          <div className="field">
            <label>Fase</label>
            <div className="status-dropdown" ref={statusDropdownRef}>
              <button
                type="button"
                className="status-dropdown-trigger"
                aria-expanded={statusDropdownOpen}
                onClick={() => setStatusDropdownOpen((prev) => !prev)}
              >
                {selectedStatusLabels.length === 1 && selectedStatusLabels[0] === "Todos"
                  ? "Todos"
                  : selectedStatusLabels.join(", ") || "Todos"}
              </button>
              {statusDropdownOpen && (
                <div className="status-dropdown-panel">
                  <label className="status-dropdown-option">
                    <input
                      type="checkbox"
                      checked={manifestFilters.statusIds.length === 0}
                      onChange={() => {
                        setManifestFilters((prev) => ({ ...prev, statusIds: [] }));
                        setCurrentManifestPage(1);
                      }}
                    />
                    <span>Todos</span>
                  </label>
                  {manifestStatuses.map((manifestStatus) => (
                    <label key={manifestStatus.id} className="status-dropdown-option">
                      <input
                        type="checkbox"
                        checked={manifestFilters.statusIds.includes(manifestStatus.id)}
                        onChange={() => {
                          handleManifestStatusFilterToggle(manifestStatus.id);
                        }}
                      />
                      <span>{manifestStatus.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="field">
            <label htmlFor="filter_vehicle_plate">Vehiculo</label>
            <select
              id="filter_vehicle_plate"
              name="vehiclePlate"
              value={manifestFilters.vehiclePlate}
              onChange={handleManifestFilterChange}
            >
              <option value="">Todos</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.plate} value={vehicle.plate}>
                  {vehicle.plate} - {vehicle.model}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="filter_driver_id">Conductor</label>
            <select
              id="filter_driver_id"
              name="driverId"
              value={manifestFilters.driverId}
              onChange={handleManifestFilterChange}
            >
              <option value="">Todos</option>
              {drivers.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.name}
                </option>
              ))}
            </select>
          </div>
          <Button type="button" variant="secondary" onClick={clearManifestFilters}>
            Limpiar filtros
          </Button>
        </div>

        <div className="owner-table-wrap">
          <table className="owner-table">
            <thead>
              <tr>
                <th>Manifiesto</th>
                <th>Ruta</th>
                <th>Vehiculo</th>
                <th>Salida</th>
                <th>Actualizado</th>
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
                  <td>{formatDateTime(manifest.updated_at)}</td>
                  <td>
                    <span className={`status-badge ${getManifestStatusBadgeClass(manifest.status?.code)}`}>
                      {manifest.status?.label || "Sin estado"}
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
                      <Button type="button" variant="secondary" onClick={() => openEditManifestModal(manifest)}>
                        Editar
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

      <ManifestFormModal
        isOpen={manifestModalOpen}
        form={manifestForm}
        vehicles={vehicles}
        drivers={drivers}
        manifestStatuses={manifestStatuses}
        onChange={handleManifestInput}
        onSubmit={submitManifest}
        onClose={closeManifestModal}
        isEditing={Boolean(editingManifestId)}
      />

      <ExpenseFormModal
        isOpen={expenseModalOpen}
        form={expenseForm}
        expenses={expenseForms}
        editingIndex={editingExpenseIndex}
        manifests={manifests}
        suppliers={suppliers}
        expenseTypes={expenseTypes}
        onChange={handleExpenseInput}
        onAdd={addExpenseForm}
        onEdit={editExpenseForm}
        onRemove={removeExpenseForm}
        onSubmit={submitExpense}
        onClose={closeExpenseModal}
        lockManifest={expenseManifestLocked}
      />
    </DashboardShell>
  );
}
