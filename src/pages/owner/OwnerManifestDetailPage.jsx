import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { api } from "../../api";
import Button from "../../components/Button";
import DashboardShell from "../../components/DashboardShell";
import TablePagination from "../../components/TablePagination";
import { getDashboardPathByRole } from "../../utils/roleRouting";

const PAGE_SIZE = 10;

const EXPENSE_TYPE_LABELS = {
  fuel: "Combustible",
  toll: "Peaje",
  maintenance: "Mantenimiento",
  food: "Alimentacion",
  lodging: "Hospedaje",
  other: "Otro",
};

const PIE_COLORS_LIGHT = ["#2d7dd2", "#3ea6d6", "#4bbf92", "#f0b45a", "#dc7b62", "#8e79d7"];
const PIE_COLORS_DARK = ["#55a6ff", "#76c1ff", "#63d4b1", "#f4c97b", "#f09785", "#ab98ea"];

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

export default function OwnerManifestDetailPage({ token, me, onLogout, theme, onToggleTheme }) {
  const { manifestId } = useParams();
  const navigate = useNavigate();
  const [manifestDetail, setManifestDetail] = useState(null);
  const [expenseTypeSummary, setExpenseTypeSummary] = useState([]);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [errorMessage, setErrorMessage] = useState("");

  const totalPages = Math.max(1, Math.ceil(totalExpenses / PAGE_SIZE));
  const expenses = manifestDetail?.expenses ?? [];

  const pieData = useMemo(() => {
    return expenseTypeSummary
      .map((item) => ({
        key: item.expense_type,
        name: EXPENSE_TYPE_LABELS[item.expense_type] || item.expense_type,
        value: Number(item.total_amount || 0),
      }))
      .filter((item) => item.value > 0);
  }, [expenseTypeSummary]);

  const chartTotal = useMemo(() => pieData.reduce((sum, item) => sum + item.value, 0), [pieData]);
  const pieColors = theme === "dark" ? PIE_COLORS_DARK : PIE_COLORS_LIGHT;

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (me && me.role !== "owner_profile") {
    return <Navigate to={getDashboardPathByRole(me.role)} replace />;
  }

  useEffect(() => {
    if (!manifestId) return;
    fetchManifestDetail(manifestId, currentPage);
  }, [manifestId, currentPage]);

  useEffect(() => {
    if (!manifestId) return;
    fetchExpenseTypeSummary(manifestId);
  }, [manifestId]);

  async function fetchManifestDetail(id, page) {
    try {
      const { data, headers } = await api.get(`/owner/manifests/${id}`, {
        params: {
          page,
          page_size: PAGE_SIZE,
        },
      });
      setManifestDetail(data);
      setTotalExpenses(Number(headers["x-total-count"] || data.expenses?.length || 0));
    } catch (err) {
      setErrorMessage(err.response?.data?.detail || "No fue posible cargar el detalle del manifiesto.");
    }
  }

  async function fetchExpenseTypeSummary(id) {
    try {
      const { data } = await api.get(`/owner/manifests/${id}/expenses/summary-by-type`);
      setExpenseTypeSummary(data);
    } catch (err) {
      setErrorMessage(err.response?.data?.detail || "No fue posible cargar el resumen de gastos por tipo.");
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
      {errorMessage ? <p className="error">{errorMessage}</p> : null}

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
              <span className={`status-badge ${manifestDetail.is_closed ? "status-maintenance" : "status-active"}`}>
                {manifestDetail.is_closed ? "Cerrada" : "Activa"}
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
              <div>
                <p className="profile-label">Conductor</p>
                <p>{manifestDetail.driver_name || "-"}</p>
              </div>
              <div className="manifest-info-full">
                <p className="profile-label">Descripcion de carga</p>
                <p>{manifestDetail.cargo_description || "-"}</p>
              </div>
            </div>
          </section>

          <section className="manifest-detail-split">
            <article className="panel owner-list-panel">
              <div className="owner-list-header">
                <div>
                  <h3>Gastos del viaje</h3>
                  <p className="hint">Total registrados: {totalExpenses}</p>
                </div>
              </div>

              <div className="owner-table-wrap">
                <table className="owner-table owner-table-tight">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Tipo</th>
                      <th>Descripcion</th>
                      <th>Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((expense) => (
                      <tr key={expense.id}>
                        <td>{formatDate(expense.expense_date)}</td>
                        <td>{EXPENSE_TYPE_LABELS[expense.expense_type] || expense.expense_type}</td>
                        <td>{expense.description}</td>
                        <td>{formatMoney(expense.amount)}</td>
                      </tr>
                    ))}
                    {expenses.length === 0 ? (
                      <tr>
                        <td colSpan={4}>No hay gastos registrados para esta ruta.</td>
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
            </article>

            <article className="panel owner-card">
              <h3>Gastos por tipo</h3>
              {pieData.length > 0 ? (
                <div className="manifest-expense-pie">
                  <div className="manifest-pie-wrap">
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={62}
                          outerRadius={96}
                          stroke="var(--c-surface)"
                          strokeWidth={2}
                          paddingAngle={2}
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={entry.key} fill={pieColors[index % pieColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) => formatMoney(value)}
                          contentStyle={{
                            borderRadius: 12,
                            border: "1px solid var(--c-border)",
                            background: "var(--c-surface)",
                            color: "var(--c-text)",
                          }}
                          itemStyle={{ color: "var(--c-text)" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="manifest-pie-legend">
                    {pieData.map((item, index) => {
                      const percent = chartTotal > 0 ? (item.value / chartTotal) * 100 : 0;
                      return (
                        <div className="manifest-pie-legend-item" key={item.key}>
                          <span
                            className="manifest-pie-swatch"
                            style={{ backgroundColor: pieColors[index % pieColors.length] }}
                            aria-hidden="true"
                          />
                          <div>
                            <p className="manifest-pie-label">{item.name}</p>
                            <p className="manifest-pie-value">
                              {formatMoney(item.value)} <span>{percent.toFixed(1)}%</span>
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="hint">Sin gastos para graficar.</p>
              )}
            </article>
          </section>

          <section className="actions-row">
            <Button type="button" variant="secondary" onClick={() => navigate(-1)}>Volver</Button>
          </section>
        </>
      ) : (
        <p className="hint">Cargando detalle del manifiesto...</p>
      )}
    </DashboardShell>
  );
}
