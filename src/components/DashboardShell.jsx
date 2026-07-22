import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";

import logo from "../assets/trucker_no_text.png";

function navLinkClass({ isActive }) {
  return `sidebar-link ${isActive ? "sidebar-link-active" : ""}`;
}

function getSidebarItems(role) {
  const baseItems = {
    owner_profile: [
      { to: "/dashboard/owner", label: "Dashboard owner", icon: "O" },
      { to: "/dashboard/profile", label: "Perfil", icon: "P" },
    ],
    driver_profile: [
      { to: "/dashboard/driver", label: "Dashboard driver", icon: "D" },
      { to: "/dashboard/profile", label: "Perfil", icon: "P" },
    ],
    admin: [
      { to: "/dashboard/admin", label: "Dashboard admin", icon: "A" },
      { to: "/dashboard/owner", label: "Dashboard owner", icon: "O" },
      { to: "/dashboard/driver", label: "Dashboard driver", icon: "D" },
      { to: "/dashboard/profile", label: "Perfil", icon: "P" },
    ],
    user: [
      { to: "/dashboard/general", label: "Dashboard general", icon: "G" },
      { to: "/dashboard/profile", label: "Perfil", icon: "P" },
    ],
  };

  return baseItems[role] || baseItems.user;
}

export default function DashboardShell({ me, title, subtitle, onLogout, theme, onToggleTheme, children }) {
  const role = me?.role || "sin perfil";
  const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem("dashboardSidebarCollapsed") === "true");
  const sidebarItems = getSidebarItems(me?.role);

  useEffect(() => {
    localStorage.setItem("dashboardSidebarCollapsed", String(isCollapsed));
  }, [isCollapsed]);

  function toggleSidebar() {
    setIsCollapsed((prev) => !prev);
  }

  return (
    <section className={`dashboard-shell ${isCollapsed ? "dashboard-shell-collapsed" : ""}`}>
      <aside className={`dashboard-sidebar ${isCollapsed ? "dashboard-sidebar-collapsed" : ""}`}>
        <div className="sidebar-brand-row">
          <img className="sidebar-logo" src={logo} alt="Trucker" />
          <button
            className="sidebar-toggle"
            type="button"
            onClick={toggleSidebar}
            aria-label={isCollapsed ? "Expandir sidebar" : "Contraer sidebar"}
            aria-expanded={!isCollapsed}
          >
            {isCollapsed ? "›" : "‹"}
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Navegacion de dashboard">
          {sidebarItems.map((item) => (
            <NavLink key={item.to} className={navLinkClass} to={item.to} end={item.to === "/dashboard/profile"}>
              <span className="sidebar-link-icon" aria-hidden="true">{item.icon}</span>
              <span className="sidebar-link-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-theme-row">
          <button className="sidebar-theme-toggle" type="button" onClick={onToggleTheme} aria-label={`Cambiar a tema ${theme === "dark" ? "claro" : "oscuro"}`}>
            <span className="sidebar-link-icon" aria-hidden="true">{theme === "dark" ? "☾" : "☼"}</span>
            <span className="sidebar-link-label">Tema {theme === "dark" ? "oscuro" : "claro"}</span>
          </button>
        </div>

        <div className="sidebar-actions">
          <button className="sidebar-logout" type="button" onClick={onLogout}>
            <span className="sidebar-action-icon" aria-hidden="true">⎋</span>
            <span className="sidebar-action-label">Cerrar sesion</span>
          </button>
        </div>
      </aside>

      <div className="dashboard-content">
        <header className="dashboard-topbar">
          <div>
            <h2>{title}</h2>
            <p className="hint">{subtitle}</p>
          </div>
          <span className="profile-chip">{role}</span>
        </header>

        <div className="profile-banner">
          Perfil activo: <strong>{role}</strong>
        </div>

        {children}
      </div>
    </section>
  );
}
