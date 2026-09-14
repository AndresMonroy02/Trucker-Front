import { Link } from "react-router-dom";

import DashboardShell from "../../components/DashboardShell";

export default function DriverDashboardPage({ token, me, onLogout, theme, onToggleTheme }) {

  return (
    <DashboardShell
      me={me}
      onLogout={onLogout}
      theme={theme}
      onToggleTheme={onToggleTheme}
      title="Dashboard de driver_profile"
      subtitle="Resumen para conductores"
    >
      <section className="panel">
        <h3>Informacion del driver_profile</h3>
        <p>Visualiza viajes activos, estado de ruta y tareas de conduccion pendientes.</p>
        <p>
          Consulta tus manifiestos asignados y registra gastos en <Link to="/dashboard/driver/manifests">Mis manifiestos</Link>.
        </p>
      </section>
    </DashboardShell>
  );
}
