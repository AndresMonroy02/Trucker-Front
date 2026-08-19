import { useEffect, useMemo, useState } from "react";
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
  is_closed: false,
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
  const [manifestForm, setManifestForm] = useState(EMPTY_MANIFEST_FORM);
  const [expenseForm, setExpenseForm] = useState(EMPTY_EXPENSE_FORM);
  const [expenseManifestLocked, setExpenseManifestLocked] = useState(false);
  const [currentManifestPage, setCurrentManifestPage] = useState(1);

  useEffect(() => {
    fetchManifests(statusFilter, currentManifestPage);
  }, [statusFilter, currentManifestPage]);

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

  const safeManifestTotalPages = Math.max(1, Math.ceil(totalManifests / MANIFEST_PAGE_SIZE));

  const activeCount = useMemo(() => manifests.filter((item) => !item.is_closed).length, [manifests]);
  const closedCount = useMemo(() => manifests.filter((item) => item.is_closed).length, [manifests]);
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
    setManifestModalOpen(true);
  }

  function closeManifestModal() {
    setManifestModalOpen(false);
  }

  function openExpenseModal(manifestId) {
    setExpenseForm({ ...EMPTY_EXPENSE_FORM, manifest_id: String(manifestId) });
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

  function handleManifestPageChange(nextPage) {
    const safePage = Math.min(Math.max(nextPage, 1), safeManifestTotalPages);
    setCurrentManifestPage(safePage);
  }

  function handleStatusFilterChange(event) {
    const nextStatus = event.target.value;
    setStatusFilter(nextStatus);
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
      const { data } = await api.post("/owner/manifests", payload);
      toast.success("Manifiesto creado correctamente.");
      closeManifestModal();
      if (currentManifestPage !== 1) {
        setCurrentManifestPage(1);
      } else {
        await fetchManifests(statusFilter, 1);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "No fue posible crear el manifiesto.");
    }
  }

  async function submitExpense(event) {
    event.preventDefault();

    if (!expenseForm.manifest_id) {
      toast.error("Selecciona un manifiesto para registrar el gasto.");
      return;
    }

    const manifestId = Number(expenseForm.manifest_id);
    const payload = {
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
    };

    try {
      await api.post(`/owner/manifests/${manifestId}/expenses`, payload);
      toast.success("Gasto registrado correctamente.");
      closeExpenseModal();
      setExpenseForm(EMPTY_EXPENSE_FORM);
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
                <th>Fase</th>
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
                  <td>{manifest.status?.label || "-"}</td>
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

      <ManifestFormModal
        isOpen={manifestModalOpen}
        form={manifestForm}
        vehicles={vehicles}
        drivers={drivers}
        manifestStatuses={manifestStatuses}
        onChange={handleManifestInput}
        onSubmit={submitManifest}
        onClose={closeManifestModal}
      />

      <ExpenseFormModal
        isOpen={expenseModalOpen}
        form={expenseForm}
        manifests={manifests}
        suppliers={suppliers}
        expenseTypes={expenseTypes}
        onChange={handleExpenseInput}
        onSubmit={submitExpense}
        onClose={closeExpenseModal}
        lockManifest={expenseManifestLocked}
      />
    </DashboardShell>
  );
}
