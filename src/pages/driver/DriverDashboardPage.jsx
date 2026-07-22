import { Navigate } from "react-router-dom";

import DashboardShell from "../../components/DashboardShell";
import { getDashboardPathByRole } from "../../utils/roleRouting";

export default function DriverDashboardPage({ token, me, onLogout, theme, onToggleTheme }) {
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (me && me.role !== "driver_profile") {
    return <Navigate to={getDashboardPathByRole(me.role)} replace />;
  }

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
      </section>
    </DashboardShell>
  );
}
