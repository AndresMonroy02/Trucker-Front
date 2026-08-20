import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";

import { api } from "../../api";
import Button from "../../components/Button";
import DashboardShell from "../../components/DashboardShell";
import ExpenseEditModal from "../../components/modals/ExpenseEditModal";
import TablePagination from "../../components/TablePagination";
import { getDashboardPathByRole } from "../../utils/roleRouting";

const PAGE_SIZE = 8;

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

function formatDateOnly(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("es-CO");
}

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

function toExpenseForm(expense) {
  return {
    manifest_id: String(expense.manifest_id),
    supplier_id: expense.supplier_id ? String(expense.supplier_id) : "",
    expense_type_id: String(expense.expense_type_id),
    description: expense.description || "",
    amount: String(expense.amount || ""),
    expense_date: expense.expense_date || "",
    payment_method: expense.payment_method || "",
    reference_code: expense.reference_code || "",
    location: expense.location || "",
    is_paid: expense.is_paid,
    notes: expense.notes || "",
  };
}

function profileTypeLabel(role) {
  return {
    owner_profile: "Propietario",
    driver_profile: "Conductor",
    admin: "Administrador",
    user: "Usuario",
  }[role] || role || "-";
}

const CREATOR_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "owner_profile", label: "Propietario" },
  { value: "driver_profile", label: "Conductor" },
];

const EMPTY_FILTERS = {
  date_from: "",
  date_to: "",
  expense_type_id: "",
  created_by_profile_type: "",
};

export default function OwnerExpensesPage({ token, me, onLogout, theme, onToggleTheme }) {
  const [expenses, setExpenses] = useState([]);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [manifests, setManifests] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [expenseTypes, setExpenseTypes] = useState([]);
  const [editingExpense, setEditingExpense] = useState(null);
  const [expenseForm, setExpenseForm] = useState(EMPTY_EXPENSE_FORM);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  const totalPages = Math.max(1, Math.ceil(totalExpenses / PAGE_SIZE));
  const paginatedExpenses = useMemo(() => expenses, [expenses]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (me && me.role !== "owner_profile") {
    return <Navigate to={getDashboardPathByRole(me.role)} replace />;
  }

  useEffect(() => {
    fetchExpenses(currentPage, filters);
  }, [currentPage, filters]);

  useEffect(() => {
    fetchEditOptions();
  }, []);

  async function fetchExpenses(page, activeFilters) {
    try {
      const { data, headers } = await api.get("/owner/expenses", {
        params: {
          page,
          page_size: PAGE_SIZE,
          date_from: activeFilters.date_from || undefined,
          date_to: activeFilters.date_to || undefined,
          expense_type_id: activeFilters.expense_type_id || undefined,
          created_by_profile_type: activeFilters.created_by_profile_type || undefined,
        },
      });
      setExpenses(data);
      setTotalExpenses(Number(headers["x-total-count"] || data.length));
    } catch (err) {
      toast.error(err.response?.data?.detail || "No fue posible cargar gastos.");
    }
  }

  function handleFilterChange(event) {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setCurrentPage(1);
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
    setCurrentPage(1);
  }


  async function fetchEditOptions() {
    try {
      const [manifestResponse, supplierResponse, expenseTypeResponse] = await Promise.all([
        api.get("/owner/manifests", { params: { status: "all", page: 1, page_size: 100 } }),
        api.get("/owner/suppliers", { params: { page: 1, page_size: 100 } }),
        api.get("/owner/expense-types"),
      ]);
      setManifests(manifestResponse.data);
      setSuppliers(supplierResponse.data);
      setExpenseTypes(expenseTypeResponse.data);
    } catch (err) {
      toast.error(err.response?.data?.detail || "No fue posible cargar los datos para editar gastos.");
    }
  }

  function openEditExpense(expense) {
    setEditingExpense(expense);
    setExpenseForm(toExpenseForm(expense));
  }

  function closeEditExpense() {
    setEditingExpense(null);
    setExpenseForm(EMPTY_EXPENSE_FORM);
    setIsDeleteConfirmOpen(false);
  }

  function handleExpenseInput(event) {
    const { name, value, type, checked } = event.target;
    setExpenseForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  }

  async function submitExpenseEdit(event) {
    event.preventDefault();
    const payload = {
      manifest_id: Number(expenseForm.manifest_id),
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
      await api.put(`/owner/expenses/${editingExpense.id}`, payload);
      toast.success("Gasto actualizado correctamente.");
      closeEditExpense();
      await fetchExpenses(currentPage, filters);
    } catch (err) {
      toast.error(err.response?.data?.detail || "No fue posible actualizar el gasto.");
    }
  }

  function requestDeleteExpense() {
    if (!editingExpense) return;
    setIsDeleteConfirmOpen(true);
  }

  function cancelDeleteExpense() {
    setIsDeleteConfirmOpen(false);
  }

  async function confirmDeleteExpense() {
    if (!editingExpense) return;

    try {
      await api.delete(`/owner/expenses/${editingExpense.id}`);
      toast.success("Gasto eliminado correctamente.");
      setIsDeleteConfirmOpen(false);
      closeEditExpense();
      await fetchExpenses(currentPage, filters);
    } catch (err) {
      toast.error(err.response?.data?.detail || "No fue posible eliminar el gasto.");
    }
  }

  function handlePageChange(nextPage) {
    const safePage = Math.min(Math.max(nextPage, 1), totalPages);
    setCurrentPage(safePage);
  }

  return (
    <DashboardShell
      me={me}
      onLogout={onLogout}
      theme={theme}
      onToggleTheme={onToggleTheme}
      title="Gastos"
      subtitle="Consulta general de gastos ordenados del mas reciente al mas antiguo"
    >
      <section className="panel owner-list-panel">
        <div className="owner-list-header">
          <div>
            <h3>Lista de gastos</h3>
            <p className="hint">Ordenados por fecha descendente. Total: {totalExpenses}</p>
          </div>
        </div>

        <div className="owner-filters-row">
          <div className="field">
            <label htmlFor="filter_date_from">Desde</label>
            <input
              id="filter_date_from"
              type="date"
              name="date_from"
              value={filters.date_from}
              onChange={handleFilterChange}
            />
          </div>
          <div className="field">
            <label htmlFor="filter_date_to">Hasta</label>
            <input
              id="filter_date_to"
              type="date"
              name="date_to"
              value={filters.date_to}
              onChange={handleFilterChange}
            />
          </div>
          <div className="field">
            <label htmlFor="filter_expense_type">Tipo de gasto</label>
            <select id="filter_expense_type" name="expense_type_id" value={filters.expense_type_id} onChange={handleFilterChange}>
              <option value="">Todos</option>
              {expenseTypes.map((type) => (
                <option key={type.id} value={type.id}>{type.label}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="filter_creator">Creado por</label>
            <select id="filter_creator" name="created_by_profile_type" value={filters.created_by_profile_type} onChange={handleFilterChange}>
              {CREATOR_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <Button type="button" variant="secondary" onClick={clearFilters}>
            Limpiar filtros
          </Button>
        </div>

        <div className="owner-table-wrap">
          <table className="owner-table owner-table-wide">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Manifiesto</th>
                <th>Ruta</th>
                <th>Tipo</th>
                <th>Descripcion</th>
                <th>Proveedor</th>
                <th>Monto</th>
                <th>Pago</th>
                <th>Creado</th>
                <th>Creado por</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginatedExpenses.map((expense) => (
                <tr key={expense.id}>
                  <td>{formatDate(expense.expense_date)}</td>
                  <td>{expense.manifest_number}</td>
                  <td>{expense.manifest_origin} - {expense.manifest_destination}</td>
                  <td>{expense.expense_type?.label || "-"}</td>
                  <td>{expense.description}</td>
                  <td>{expense.supplier_name || "-"}</td>
                  <td>{formatMoney(expense.amount)}</td>
                  <td>{expense.is_paid ? "Pagado" : "Pendiente"}</td>
                  <td>{formatDateOnly(expense.expense_date)}</td>
                  <td>{profileTypeLabel(expense.created_by_profile_type)}</td>
                  <td><button type="button" className="table-action-button" onClick={() => openEditExpense(expense)}>Editar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <TablePagination
          page={currentPage}
          totalItems={totalExpenses}
          pageSize={PAGE_SIZE}
          onPageChange={handlePageChange}
          itemLabel="gastos"
        />
      </section>

      <ExpenseEditModal
        isOpen={Boolean(editingExpense)}
        form={expenseForm}
        manifests={manifests}
        suppliers={suppliers}
        expenseTypes={expenseTypes}
        onChange={handleExpenseInput}
        onSubmit={submitExpenseEdit}
        onClose={closeEditExpense}
        onDelete={requestDeleteExpense}
        isDeleteConfirmOpen={isDeleteConfirmOpen}
        onConfirmDelete={confirmDeleteExpense}
        onCancelDelete={cancelDeleteExpense}
      />
    </DashboardShell>
  );
}
