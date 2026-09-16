import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { api } from "../../api";
import DashboardShell from "../../components/DashboardShell";
import { formatDate, formatMoney, formatPercent } from "../../utils/format";

const PIE_COLORS_LIGHT = ["#2d7dd2", "#3ea6d6", "#4bbf92", "#f0b45a", "#dc7b62", "#8e79d7"];
const PIE_COLORS_DARK = ["#55a6ff", "#76c1ff", "#63d4b1", "#f4c97b", "#f09785", "#ab98ea"];

function pad(value) {
  return String(value).padStart(2, "0");
}

function getCurrentMonthRange() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const lastDay = new Date(year, month, 0).getDate();
  return {
    date_from: `${year}-${pad(month)}-01`,
    date_to: `${year}-${pad(month)}-${pad(lastDay)}`,
  };
}

export default function OwnerDashboardPage({ token, me, onLogout, theme, onToggleTheme }) {
  const [dateRange, setDateRange] = useState(getCurrentMonthRange);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  const pieColors = theme === "dark" ? PIE_COLORS_DARK : PIE_COLORS_LIGHT;

  useEffect(() => {
    if (!token || (me && me.role !== "owner_profile")) return undefined;

    let active = true;
    setLoading(true);
    api
      .get("/owner/dashboard/summary", { params: dateRange })
      .then((response) => {
        if (active) setSummary(response.data);
      })
      .catch(() => {
        if (active) toast.error("No se pudo cargar el resumen del dashboard");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token, me, dateRange]);

  const byVehicle = summary?.by_vehicle ?? [];
  const byExpenseCategory = summary?.by_expense_category ?? [];

  const manifestCountData = useMemo(
    () => byVehicle.map((item) => ({ key: item.vehicle_id, plate: item.plate, viajes: item.manifest_count })),
    [byVehicle]
  );

  const financialsData = useMemo(
    () =>
      byVehicle.map((item) => ({
        key: item.vehicle_id,
        plate: item.plate,
        manifiestos: Number(item.total_manifest_value || 0),
        cobrado: Number(item.total_paid || 0),
        gastos: Number(item.total_expenses || 0),
        // Costs booked against this truck outside any trip. Charted beside the
        // trip figures, never added into them.
        generales: Number(item.general_expenses || 0),
        resultado: Number(item.net_result || 0),
      })),
    [byVehicle]
  );

  const manifestValuePieData = useMemo(
    () =>
      byVehicle
        .map((item) => ({ key: item.vehicle_id, name: item.plate, value: Number(item.total_manifest_value || 0) }))
        .filter((item) => item.value > 0),
    [byVehicle]
  );

  const expenseCategoryData = useMemo(
    () =>
      byExpenseCategory.map((item) => ({
        category: item.expense_type_label,
        total: Number(item.total_amount || 0),
      })),
    [byExpenseCategory]
  );

  const totals = summary?.totals;
  const currency = summary?.currency || "COP";
  const worstManifests = summary?.worst_manifests ?? [];
  const totalManifestValue = Number(totals?.total_freight || 0);
  const totalCollected = Number(totals?.total_collected || 0);
  const totalReceivable = Number(totals?.total_receivable || 0);
  const totalExpenses = Number(totals?.total_expenses || 0);
  const totalManifests = Number(totals?.manifest_count || 0);
  const netMargin = Number(totals?.net_result || 0);
  const generalExpenses = Number(totals?.total_general_expenses || 0);
  const netAfterGeneral = Number(totals?.net_result_after_general || 0);

  return (
    <DashboardShell
      me={me}
      onLogout={onLogout}
      theme={theme}
      onToggleTheme={onToggleTheme}
      title="Dashboard de propietario"
      subtitle="Resumen operativo de viajes y rentabilidad de la flota"
    >
      <section className="panel owner-kpi-grid">
        <article className="kpi-card">
          <span className="kpi-label">Valor manifiestos</span>
          <strong className="kpi-value">{formatMoney(totalManifestValue, currency)}</strong>
          <span className="kpi-hint">Fletes acordados en el periodo</span>
        </article>
        <article className="kpi-card">
          <span className="kpi-label">Cobrado</span>
          <strong className="kpi-value">{formatMoney(totalCollected, currency)}</strong>
          <span className="kpi-hint">Lo que los clientes ya pagaron</span>
        </article>
        <article className="kpi-card">
          <span className="kpi-label">Por cobrar</span>
          <strong className={`kpi-value ${totalReceivable > 0 ? "kpi-negative" : "kpi-positive"}`}>
            {formatMoney(totalReceivable, currency)}
          </strong>
          <span className="kpi-hint">Cartera pendiente del periodo</span>
        </article>
        <article className="kpi-card">
          <span className="kpi-label">Gastos de viaje</span>
          <strong className="kpi-value">{formatMoney(totalExpenses, currency)}</strong>
          <span className="kpi-hint">Costo de los viajes del periodo</span>
        </article>
        {/* Windowed on their own date, not on a departure date -- they have no
            trip. Kept out of the margin below so a trip's margin never moves
            because somebody bought tyres that week. */}
        <article className="kpi-card">
          <span className="kpi-label">Gastos generales</span>
          <strong className="kpi-value">{formatMoney(generalExpenses, currency)}</strong>
          <span className="kpi-hint">Llantas, mantenimiento, polizas: fuera de viaje</span>
        </article>
        <article className="kpi-card">
          <span className="kpi-label">Resultado de viajes</span>
          <strong className={`kpi-value ${netMargin >= 0 ? "kpi-positive" : "kpi-negative"}`}>{formatMoney(netMargin, currency)}</strong>
          <span className="kpi-hint">Flete menos gastos de viaje</span>
        </article>
        <article className="kpi-card">
          <span className="kpi-label">Resultado neto</span>
          <strong className={`kpi-value ${netAfterGeneral >= 0 ? "kpi-positive" : "kpi-negative"}`}>
            {formatMoney(netAfterGeneral, currency)}
          </strong>
          <span className="kpi-hint">Despues de los gastos generales</span>
        </article>
        <article className="kpi-card">
          <span className="kpi-label">Margen</span>
          <strong className={`kpi-value ${Number(totals?.margin_pct || 0) >= 0 ? "kpi-positive" : "kpi-negative"}`}>
            {formatPercent(totals?.margin_pct)}
          </strong>
          <span className="kpi-hint">{totalManifests} manifiesto(s) en el periodo</span>
        </article>
      </section>

      <section className="panel owner-overview">
        <div className="owner-list-header">
          <div>
            <h3>Gestion rapida</h3>
            <p className="hint">Accede a la administracion de manifiestos, gastos, proveedores, vehiculos y conductores.</p>
          </div>
          <div className="actions-row">
            <Link className="quick-link" to="/dashboard/owner/routes">Ver manifiestos</Link>
            <Link className="quick-link" to="/dashboard/owner/expenses">Ver gastos</Link>
            <Link className="quick-link" to="/dashboard/owner/finance">Ver cartera</Link>
            <Link className="quick-link" to="/dashboard/owner/suppliers">Ver proveedores</Link>
            <Link className="quick-link" to="/dashboard/owner/vehicles">Ver vehiculos</Link>
            <Link className="quick-link" to="/dashboard/owner/drivers">Ver conductores</Link>
          </div>
        </div>

        <div className="owner-filters-row">
          <div className="field">
            <label htmlFor="dashboard_date_from">Desde</label>
            <input
              id="dashboard_date_from"
              type="date"
              value={dateRange.date_from}
              max={dateRange.date_to}
              onChange={(event) => setDateRange((prev) => ({ ...prev, date_from: event.target.value }))}
            />
          </div>
          <div className="field">
            <label htmlFor="dashboard_date_to">Hasta</label>
            <input
              id="dashboard_date_to"
              type="date"
              value={dateRange.date_to}
              min={dateRange.date_from}
              onChange={(event) => setDateRange((prev) => ({ ...prev, date_to: event.target.value }))}
            />
          </div>
        </div>
      </section>

      <section className="panel owner-grid">
        <article className="owner-card">
          <h3>Manifiestos por vehiculo</h3>
          <p className="hint">Cantidad de manifiestos generados por cada vehiculo en el periodo.</p>
          {manifestCountData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={manifestCountData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--c-border)" />
                <XAxis dataKey="plate" tick={{ fill: "var(--c-text-muted)", fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fill: "var(--c-text-muted)", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid var(--c-border)", background: "var(--c-surface)", color: "var(--c-text)" }}
                />
                <Bar dataKey="viajes" name="Manifiestos" fill="var(--c-primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="hint">Sin manifiestos para graficar en este periodo.</p>
          )}
        </article>

        <article className="owner-card">
          <h3>Valor de manifiestos vs gastos</h3>
          <p className="hint">
            Por vehiculo: lo facturado, lo cobrado y lo que costo. Los gastos generales
            (llantas, mantenimiento, polizas) se muestran aparte y no entran en el margen.
          </p>
          {financialsData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={financialsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--c-border)" />
                <XAxis dataKey="plate" tick={{ fill: "var(--c-text-muted)", fontSize: 12 }} />
                <YAxis tick={{ fill: "var(--c-text-muted)", fontSize: 12 }} />
                <Tooltip
                  formatter={(value) => formatMoney(value, currency)}
                  contentStyle={{ borderRadius: 12, border: "1px solid var(--c-border)", background: "var(--c-surface)", color: "var(--c-text)" }}
                />
                <Legend />
                <Bar dataKey="manifiestos" name="Flete" fill="#2e9f7f" radius={[6, 6, 0, 0]} />
                <Bar dataKey="cobrado" name="Cobrado" fill="#3ea6d6" radius={[6, 6, 0, 0]} />
                <Bar dataKey="gastos" name="Gastos de viaje" fill="#c65a52" radius={[6, 6, 0, 0]} />
                <Bar dataKey="generales" name="Gastos generales" fill="#d99a3f" radius={[6, 6, 0, 0]} />
                <Bar dataKey="resultado" name="Resultado" fill="#8e79d7" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="hint">Sin datos financieros para graficar en este periodo.</p>
          )}
        </article>

        <article className="owner-card">
          <h3>Valor de manifiestos por vehiculo</h3>
          <p className="hint">Participacion de cada vehiculo en el valor total facturado.</p>
          {manifestValuePieData.length > 0 ? (
            <div className="manifest-expense-pie">
              <div className="manifest-pie-wrap">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={manifestValuePieData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={62}
                      outerRadius={96}
                      stroke="var(--c-surface)"
                      strokeWidth={2}
                      paddingAngle={2}
                    >
                      {manifestValuePieData.map((entry, index) => (
                        <Cell key={entry.key} fill={pieColors[index % pieColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => formatMoney(value, currency)}
                      contentStyle={{ borderRadius: 12, border: "1px solid var(--c-border)", background: "var(--c-surface)", color: "var(--c-text)" }}
                      itemStyle={{ color: "var(--c-text)" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="manifest-pie-legend">
                {manifestValuePieData.map((item, index) => {
                  const percent = totalManifestValue > 0 ? (item.value / totalManifestValue) * 100 : 0;
                  return (
                    <div className="manifest-pie-legend-item" key={item.key}>
                      <span className="manifest-pie-swatch" style={{ backgroundColor: pieColors[index % pieColors.length] }} aria-hidden="true" />
                      <div>
                        <p className="manifest-pie-label">{item.name}</p>
                        <p className="manifest-pie-value">
                          {formatMoney(item.value, currency)} <span>{percent.toFixed(1)}%</span>
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="hint">Sin valor de manifiestos para graficar en este periodo.</p>
          )}
        </article>

        <article className="owner-card">
          <h3>Gastos por categoria</h3>
          <p className="hint">Total de gastos agrupados por tipo en el periodo seleccionado.</p>
          {expenseCategoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={expenseCategoryData} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--c-border)" />
                <XAxis type="number" tick={{ fill: "var(--c-text-muted)", fontSize: 12 }} />
                <YAxis type="category" dataKey="category" width={110} tick={{ fill: "var(--c-text-muted)", fontSize: 12 }} />
                <Tooltip
                  formatter={(value) => formatMoney(value, currency)}
                  contentStyle={{ borderRadius: 12, border: "1px solid var(--c-border)", background: "var(--c-surface)", color: "var(--c-text)" }}
                />
                <Bar dataKey="total" name="Gastos" fill="var(--c-secondary)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="hint">Sin gastos para graficar en este periodo.</p>
          )}
        </article>
      </section>

      <section className="panel owner-list-panel">
        <div className="owner-list-header">
          <div>
            <h3>Viajes menos rentables</h3>
            <p className="hint">Los cinco viajes del periodo con el margen mas bajo. Empieza por aca.</p>
          </div>
          <Link className="quick-link" to="/dashboard/owner/routes">Ver todos</Link>
        </div>

        <div className="owner-table-wrap">
          <table className="owner-table owner-table-tight">
            <thead>
              <tr>
                <th>Manifiesto</th>
                <th>Ruta</th>
                <th>Salida</th>
                <th>Vehiculo</th>
                <th>Conductor</th>
                <th>Flete</th>
                <th>Gastos</th>
                <th>Resultado</th>
                <th>Margen</th>
              </tr>
            </thead>
            <tbody>
              {worstManifests.map((item) => (
                <tr key={item.manifest_id}>
                  <td>
                    <Link to={`/dashboard/owner/routes/${item.manifest_id}`}>{item.manifest_number}</Link>
                  </td>
                  <td>{item.origin} - {item.destination}</td>
                  <td>{formatDate(item.departure_date)}</td>
                  <td>{item.vehicle_plate || "-"}</td>
                  <td>{item.driver_name || "-"}</td>
                  <td>{formatMoney(item.freight_value, currency)}</td>
                  <td>{formatMoney(item.total_expenses, currency)}</td>
                  <td className={Number(item.net_result || 0) >= 0 ? "kpi-positive" : "kpi-negative"}>
                    {formatMoney(item.net_result, currency)}
                  </td>
                  <td className={Number(item.margin_pct || 0) >= 0 ? "kpi-positive" : "kpi-negative"}>
                    {formatPercent(item.margin_pct)}
                  </td>
                </tr>
              ))}
              {worstManifests.length === 0 ? (
                <tr>
                  <td colSpan={9}>Sin viajes con flete registrado en este periodo.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {loading ? <p className="hint">Actualizando datos...</p> : null}
    </DashboardShell>
  );
}
