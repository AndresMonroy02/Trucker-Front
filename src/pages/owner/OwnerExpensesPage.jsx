import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";

import { api } from "../../api";
import DashboardShell from "../../components/DashboardShell";
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

export default function OwnerExpensesPage({ token, me, onLogout, theme, onToggleTheme }) {
  const [expenses, setExpenses] = useState([]);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(totalExpenses / PAGE_SIZE));
  const paginatedExpenses = useMemo(() => expenses, [expenses]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (me && me.role !== "owner_profile") {
    return <Navigate to={getDashboardPathByRole(me.role)} replace />;
  }

  useEffect(() => {
    fetchExpenses(currentPage);
  }, [currentPage]);

  async function fetchExpenses(page) {
    try {
      const { data, headers } = await api.get("/owner/expenses", {
        params: { page, page_size: PAGE_SIZE },
      });
      setExpenses(data);
      setTotalExpenses(Number(headers["x-total-count"] || data.length));
    } catch (err) {
      toast.error(err.response?.data?.detail || "No fue posible cargar gastos.");
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
                <th>Creado por</th>
                <th>Monto</th>
                <th>Pago</th>
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
                  <td>{expense.created_by_username || "-"}</td>
                  <td>{formatMoney(expense.amount)}</td>
                  <td>{expense.is_paid ? "Pagado" : "Pendiente"}</td>
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
    </DashboardShell>
  );
}
