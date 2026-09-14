
import DashboardShell from "../../components/DashboardShell";

export default function GeneralDashboardPage({ token, me, onLogout, theme, onToggleTheme }) {

  return (
    <DashboardShell
      me={me}
      onLogout={onLogout}
      theme={theme}
      onToggleTheme={onToggleTheme}
      title="Dashboard general"
      subtitle="Vista para perfiles heredados"
    >
      <section className="panel">
        <h3>Informacion de perfil</h3>
        <p>Tu cuenta usa un perfil general del sistema (user o admin).</p>
      </section>
    </DashboardShell>
  );
}
