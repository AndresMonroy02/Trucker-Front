import { Link, Navigate } from "react-router-dom";

import DashboardShell from "../../components/DashboardShell";
import { getDashboardPathByRole } from "../../utils/roleRouting";

export default function OwnerDashboardPage({ token, me, onLogout, theme, onToggleTheme }) {
  const tripsByVehicle = [
    { plate: "TRK-120", trips: 24 },
    { plate: "TRK-218", trips: 18 },
    { plate: "TRK-331", trips: 30 },
    { plate: "TRK-416", trips: 15 },
  ];

  const financialsByTruck = [
    { plate: "TRK-120", expenses: 3200, earnings: 6400 },
    { plate: "TRK-218", expenses: 2800, earnings: 5700 },
    { plate: "TRK-331", expenses: 3600, earnings: 7100 },
    { plate: "TRK-416", expenses: 2400, earnings: 4900 },
  ];

  const maxTrips = Math.max(...tripsByVehicle.map((item) => item.trips));
  const maxFinancial = Math.max(...financialsByTruck.map((item) => Math.max(item.expenses, item.earnings)));
  const totalTrips = tripsByVehicle.reduce((sum, item) => sum + item.trips, 0);
  const totalExpenses = financialsByTruck.reduce((sum, item) => sum + item.expenses, 0);
  const totalEarnings = financialsByTruck.reduce((sum, item) => sum + item.earnings, 0);
  const netMargin = totalEarnings - totalExpenses;

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (me && me.role !== "owner_profile") {
    return <Navigate to={getDashboardPathByRole(me.role)} replace />;
  }

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
          <span className="kpi-label">Ingresos</span>
          <strong className="kpi-value">${totalEarnings.toLocaleString("es-CO")}</strong>
          <span className="kpi-hint">Facturacion estimada del periodo</span>
        </article>
        <article className="kpi-card">
          <span className="kpi-label">Gastos</span>
          <strong className="kpi-value">${totalExpenses.toLocaleString("es-CO")}</strong>
          <span className="kpi-hint">Costo operativo consolidado</span>
        </article>
        <article className="kpi-card">
          <span className="kpi-label">Margen</span>
          <strong className={`kpi-value ${netMargin >= 0 ? "kpi-positive" : "kpi-negative"}`}>${netMargin.toLocaleString("es-CO")}</strong>
          <span className="kpi-hint">Resultado neto preliminar</span>
        </article>
        <article className="kpi-card">
          <span className="kpi-label">Viajes</span>
          <strong className="kpi-value">{totalTrips}</strong>
          <span className="kpi-hint">Viajes completados por la flota</span>
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
            <Link className="quick-link" to="/dashboard/owner/suppliers">Ver proveedores</Link>
            <Link className="quick-link" to="/dashboard/owner/vehicles">Ver vehiculos</Link>
            <Link className="quick-link" to="/dashboard/owner/drivers">Ver conductores</Link>
          </div>
        </div>
      </section>

      <section className="panel owner-grid">
        <article className="owner-card">
          <h3>Viajes por vehiculo</h3>
          <p className="hint">Mock data mensual de viajes completados.</p>
          <div className="chart-list">
            {tripsByVehicle.map((item) => (
              <div key={item.plate} className="chart-row">
                <span className="chart-label">{item.plate}</span>
                <div className="chart-track" role="presentation">
                  <div
                    className="chart-bar"
                    style={{ width: `${(item.trips / maxTrips) * 100}%` }}
                    aria-label={`${item.trips} viajes para ${item.plate}`}
                  />
                </div>
                <span className="chart-value">{item.trips}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="owner-card">
          <h3>Gastos vs ganancias</h3>
          <p className="hint">Mock data mensual de costos y facturacion por camion.</p>
          <div className="chart-list">
            {financialsByTruck.map((item) => (
              <div key={item.plate} className="chart-row chart-row-finance">
                <span className="chart-label">{item.plate}</span>
                <div className="chart-track chart-track-finance" role="presentation">
                  <div className="finance-pair">
                    <div
                      className="chart-bar chart-expense"
                      style={{ width: `${(item.expenses / maxFinancial) * 100}%` }}
                      title={`Gastos: $${item.expenses}`}
                    />
                    <div
                      className="chart-bar chart-earnings"
                      style={{ width: `${(item.earnings / maxFinancial) * 100}%` }}
                      title={`Ganancias: $${item.earnings}`}
                    />
                  </div>
                </div>
                <span className="chart-value chart-finance-values">E ${item.expenses} | G ${item.earnings}</span>
              </div>
            ))}
          </div>
        </article>
      </section>
    </DashboardShell>
  );
}
