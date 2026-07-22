import { Navigate } from "react-router-dom";

import DashboardShell from "../../components/DashboardShell";

export default function ProfilePage({ token, me, onLogout, theme, onToggleTheme }) {
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (!me) {
    return (
      <DashboardShell me={me} onLogout={onLogout} theme={theme} onToggleTheme={onToggleTheme} title="Perfil" subtitle="Cargando datos del perfil...">
        <section className="panel">
          <p className="hint">Cargando perfil...</p>
        </section>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell me={me} onLogout={onLogout} theme={theme} onToggleTheme={onToggleTheme} title="Perfil" subtitle="Informacion de tu cuenta">
      <section className="panel profile-page-panel">
        <h3>Datos de perfil</h3>
        <div className="profile-grid">
          <div>
            <span className="profile-label">Usuario</span>
            <strong>{me.username}</strong>
          </div>
          <div>
            <span className="profile-label">Correo</span>
            <strong>{me.email}</strong>
          </div>
          <div>
            <span className="profile-label">Rol</span>
            <strong>{me.role}</strong>
          </div>
          <div>
            <span className="profile-label">Estado</span>
            <strong>Activo</strong>
          </div>
        </div>
      </section>
    </DashboardShell>
  );
}