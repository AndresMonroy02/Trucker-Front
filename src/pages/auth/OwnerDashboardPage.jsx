import { Navigate } from "react-router-dom";

import DashboardShell from "../../components/DashboardShell";
import { getDashboardPathByRole } from "../../utils/roleRouting";

export default function OwnerDashboardPage({ token, me, onLogout, theme, onToggleTheme }) {
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
      title="Dashboard de owner_profile"
      subtitle="Resumen para propietarios de unidad"
    >
      <section className="panel">
        <h3>Informacion del owner_profile</h3>
        <p>Desde aqui puedes revisar tus unidades, estado y operaciones principales.</p>
      </section>
    </DashboardShell>
  );
}
