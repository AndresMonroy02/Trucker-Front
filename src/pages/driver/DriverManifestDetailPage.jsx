import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { api } from "../../api";
import Button from "../../components/Button";
import DashboardShell from "../../components/DashboardShell";
import ExpenseFormModal from "../../components/modals/ExpenseFormModal";
import TablePagination from "../../components/TablePagination";
import { getDashboardPathByRole } from "../../utils/roleRouting";

const PAGE_SIZE = 10;

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

function profileTypeLabel(role) {
  return {
    owner_profile: "Propietario",
    driver_profile: "Conductor",
    admin: "Administrador",
    user: "Usuario",
  }[role] || role || "-";
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

export default function DriverManifestDetailPage({ token, me, onLogout, theme, onToggleTheme }) {
  const { manifestId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [manifestDetail, setManifestDetail] = useState(null);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [expenseTypes, setExpenseTypes] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState(EMPTY_EXPENSE_FORM);
  const [expenseForms, setExpenseForms] = useState([]);
  const [editingExpenseIndex, setEditingExpenseIndex] = useState(null);

  const totalPages = Math.max(1, Math.ceil(totalExpenses / PAGE_SIZE));
  const expenses = manifestDetail?.expenses ?? [];
  const canAddExpense = manifestDetail?.status?.code === "in_transit";

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (me && me.role !== "driver_profile") {
    return <Navigate to={getDashboardPathByRole(me.role)} replace />;
  }

  useEffect(() => {
    if (!manifestId) return;
    fetchManifestDetail(manifestId, currentPage);
  }, [manifestId, currentPage]);

  useEffect(() => {
    fetchExpenseTypes();
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  useEffect(() => {
    if (searchParams.get("addExpense") === "1" && canAddExpense) {
      openExpenseModal();
      searchParams.delete("addExpense");
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manifestDetail]);

  async function fetchManifestDetail(id, page) {
    try {
      const { data, headers } = await api.get(`/driver/manifests/${id}`, {
        params: { page, page_size: PAGE_SIZE },
      });
      setManifestDetail(data);
      setTotalExpenses(Number(headers["x-total-count"] || data.expenses?.length || 0));
    } catch (err) {
      toast.error(err.response?.data?.detail || "No fue posible cargar el detalle del manifiesto.");
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

  function openExpenseModal() {
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
    setExpenseForm({ ...EMPTY_EXPENSE_FORM, manifest_id: String(manifestId) });
    setEditingExpenseIndex(null);
  }

  function editExpenseForm(index) {
    setExpenseForm(expenseForms[index]);
    setEditingExpenseIndex(index);
  }

  function removeExpenseForm(index) {
    setExpenseForms((prev) => prev.filter((_, formIndex) => formIndex !== index));
    if (editingExpenseIndex === index) {
      setExpenseForm({ ...EMPTY_EXPENSE_FORM, manifest_id: String(manifestId) });
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
      await fetchManifestDetail(manifestId, currentPage);
    } catch (err) {
      toast.error(err.response?.data?.detail || "No fue posible registrar el gasto.");
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
      title="Detalle de manifiesto"
      subtitle={manifestDetail ? `${manifestDetail.manifest_number} | ${manifestDetail.origin} - ${manifestDetail.destination}` : "Cargando informacion de ruta"}
    >
      <div className="actions-row">
        <Button type="button" variant="secondary" onClick={() => navigate("/dashboard/driver/manifests")}>
          Volver a mis manifiestos
        </Button>
      </div>

      {manifestDetail ? (
        <>
          <section className="owner-kpi-grid manifest-kpi-grid">
            <article className="kpi-card">
              <p className="kpi-label">Valor manifiesto</p>
              <p className="kpi-value">{formatMoney(manifestDetail.freight_value)}</p>
              <p className="kpi-hint">Ingresos proyectados del viaje</p>
            </article>

            <article className="kpi-card">
              <p className="kpi-label">Total gastos</p>
              <p className="kpi-value">{formatMoney(manifestDetail.total_expenses)}</p>
              <p className="kpi-hint">Suma de egresos de la ruta</p>
            </article>

            <article className="kpi-card">
              <p className="kpi-label">Resultado</p>
              <p className={`kpi-value ${Number(manifestDetail.net_result || 0) >= 0 ? "kpi-positive" : "kpi-negative"}`}>
                {formatMoney(manifestDetail.net_result)}
              </p>
              <p className="kpi-hint">Flete menos gastos</p>
            </article>
          </section>

          <section className="panel owner-card manifest-info-card">
            <div className="manifest-info-header">
              <h3>Informacion del manifiesto</h3>
              <span className={`status-badge ${["delivered", "cancelled"].includes(manifestDetail.status?.code) ? "status-maintenance" : "status-active"}`}>
                {manifestDetail.status?.label || "Sin estado"}
              </span>
            </div>

            <div className="manifest-info-grid">
              <div>
                <p className="profile-label">Numero</p>
                <p>{manifestDetail.manifest_number}</p>
              </div>
              <div>
                <p className="profile-label">Ruta</p>
                <p>{manifestDetail.origin} - {manifestDetail.destination}</p>
              </div>
              <div>
                <p className="profile-label">Fecha salida</p>
                <p>{formatDate(manifestDetail.departure_date)}</p>
              </div>
              <div>
                <p className="profile-label">Fecha llegada</p>
                <p>{formatDate(manifestDetail.arrival_date)}</p>
              </div>
              <div>
                <p className="profile-label">Vehiculo</p>
                <p>{manifestDetail.vehicle_plate || "-"}</p>
              </div>
              <div className="manifest-info-full">
                <p className="profile-label">Descripcion de carga</p>
                <p>{manifestDetail.cargo_description || "-"}</p>
              </div>
            </div>

            {!canAddExpense ? (
              <p className="hint">Solo puedes agregar gastos cuando el manifiesto esta en transito.</p>
            ) : null}
          </section>

          <section className="panel owner-list-panel">
            <div className="owner-list-header">
              <div>
                <h3>Gastos del viaje</h3>
                <p className="hint">Total registrados: {totalExpenses}</p>
              </div>
              <Button type="button" onClick={openExpenseModal} disabled={!canAddExpense}>
                Agregar gasto
              </Button>
            </div>

            <div className="owner-table-wrap">
              <table className="owner-table owner-table-tight">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Descripcion</th>
                    <th>Monto</th>
                    <th>Creado por</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense) => (
                    <tr key={expense.id}>
                      <td>{formatDate(expense.expense_date)}</td>
                      <td>{expense.expense_type?.label || "-"}</td>
                      <td>{expense.description}</td>
                      <td>{formatMoney(expense.amount)}</td>
                      <td>{profileTypeLabel(expense.created_by_profile_type)}</td>
                    </tr>
                  ))}
                  {expenses.length === 0 ? (
                    <tr>
                      <td colSpan={5}>No hay gastos registrados para esta ruta.</td>
                    </tr>
                  ) : null}
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
        </>
      ) : (
        <section className="panel">
          <p>Cargando informacion del manifiesto...</p>
        </section>
      )}

      <ExpenseFormModal
        isOpen={expenseModalOpen}
        form={expenseForm}
        expenses={expenseForms}
        editingIndex={editingExpenseIndex}
        manifests={manifestDetail ? [manifestDetail] : []}
        suppliers={suppliers}
        expenseTypes={expenseTypes}
        onChange={handleExpenseInput}
        onSubmit={submitExpense}
        onClose={closeExpenseModal}
        onAdd={addExpenseForm}
        onEdit={editExpenseForm}
        onRemove={removeExpenseForm}
        lockManifest
      />
    </DashboardShell>
  );
}
