import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { api } from "../../api";
import Button from "../../components/Button";
import DashboardShell from "../../components/DashboardShell";
import ExpenseFormModal from "../../components/modals/ExpenseFormModal";
import TablePagination from "../../components/TablePagination";
import { getDashboardPathByRole } from "../../utils/roleRouting";

const PAGE_SIZE = 8;

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

export default function DriverManifestsPage({ token, me, onLogout, theme, onToggleTheme }) {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState("all");
  const [manifests, setManifests] = useState([]);
  const [totalManifests, setTotalManifests] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [expenseTypes, setExpenseTypes] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState(EMPTY_EXPENSE_FORM);
  const [expenseForms, setExpenseForms] = useState([]);
  const [editingExpenseIndex, setEditingExpenseIndex] = useState(null);

  const totalPages = Math.max(1, Math.ceil(totalManifests / PAGE_SIZE));
  const paginatedManifests = useMemo(() => manifests, [manifests]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (me && me.role !== "driver_profile") {
    return <Navigate to={getDashboardPathByRole(me.role)} replace />;
  }

  useEffect(() => {
    fetchManifests(statusFilter, currentPage);
  }, [statusFilter, currentPage]);

  useEffect(() => {
    fetchExpenseTypes();
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  async function fetchManifests(status, page) {
    try {
      const { data, headers } = await api.get("/driver/manifests", {
        params: { status, page, page_size: PAGE_SIZE },
      });
      setManifests(data);
      setTotalManifests(Number(headers["x-total-count"] || data.length));
    } catch (err) {
      toast.error(err.response?.data?.detail || "No fue posible cargar tus manifiestos.");
    }
  }

  async function fetchExpenseTypes() {
    try {
      const { data } = await api.get("/driver/expense-types");
      setExpenseTypes(data);
    } catch (err) {
      toast.error(err.response?.data?.detail || "No fue posible cargar los tipos de gasto.");
    }
  }

  async function fetchSuppliers() {
    try {
      const { data } = await api.get("/driver/suppliers");
      setSuppliers(data);
    } catch (err) {
      toast.error(err.response?.data?.detail || "No fue posible cargar proveedores.");
    }
  }

  function handleStatusFilterChange(nextStatus) {
    setStatusFilter(nextStatus);
    setCurrentPage(1);
  }

  function handlePageChange(nextPage) {
    const safePage = Math.min(Math.max(nextPage, 1), totalPages);
    setCurrentPage(safePage);
  }

  function openExpenseModal(manifestId) {
    setExpenseForm({ ...EMPTY_EXPENSE_FORM, manifest_id: String(manifestId) });
    setExpenseForms([]);
    setEditingExpenseIndex(null);
    setExpenseModalOpen(true);
  }

  function closeExpenseModal() {
    setExpenseModalOpen(false);
  }

  function handleExpenseInput(event) {
    const { name, value, type, checked } = event.target;
    setExpenseForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  }

  function validateExpenseForm(form) {
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
      expenses: expensesToSubmit.map((item) => ({
        supplier_id: item.supplier_id ? Number(item.supplier_id) : null,
        expense_type_id: Number(item.expense_type_id),
        description: item.description,
        amount: Number(item.amount),
        expense_date: item.expense_date,
        payment_method: item.payment_method || null,
        reference_code: item.reference_code || null,
        location: item.location || null,
        is_paid: item.is_paid,
        notes: item.notes || null,
      })),
    };

    try {
      await api.post(`/driver/manifests/${manifestId}/expenses/bulk`, payload);
      toast.success(`${expensesToSubmit.length} gasto(s) registrado(s) correctamente.`);
      closeExpenseModal();
      setExpenseForm(EMPTY_EXPENSE_FORM);
      setExpenseForms([]);
      setEditingExpenseIndex(null);
      await fetchManifests(statusFilter, currentPage);
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
      title="Mis manifiestos"
      subtitle="Consulta los manifiestos asignados a tu nombre"
    >
      <section className="panel owner-list-panel">
        <div className="owner-list-header">
          <div>
            <h3>Manifiestos asignados</h3>
            <p className="hint">Total registrados: {totalManifests}</p>
          </div>
          <div className="field owner-status-filter">
            <label htmlFor="driver_status_filter">Estado</label>
            <select
              id="driver_status_filter"
              value={statusFilter}
              onChange={(event) => handleStatusFilterChange(event.target.value)}
            >
              <option value="all">Todos</option>
              <option value="active">Activos</option>
              <option value="closed">Cerrados</option>
            </select>
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
                    <span className={`status-badge ${getManifestStatusBadgeClass(manifest.status?.code)}`}>
                      {manifest.status?.label || "Sin estado"}
                    </span>
                  </td>
                  <td>{formatMoney(manifest.freight_value)}</td>
                  <td>{formatMoney(manifest.total_expenses)}</td>
                  <td>
                    <div className="owner-row-actions">
                      <Button type="button" variant="secondary" onClick={() => navigate(`/dashboard/driver/manifests/${manifest.id}`)}>
                        Ver detalle
                      </Button>
                      <Button
                        type="button"
                        disabled={manifest.status?.code !== "in_transit"}
                        onClick={() => openExpenseModal(manifest.id)}
                      >
                        Agregar gasto
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedManifests.length === 0 ? (
                <tr>
                  <td colSpan={8}>No tienes manifiestos asignados.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <TablePagination
          page={currentPage}
          totalItems={totalManifests}
          pageSize={PAGE_SIZE}
          onPageChange={handlePageChange}
          itemLabel="manifiestos"
        />
      </section>

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
        lockManifest
      />
    </DashboardShell>
  );
}
