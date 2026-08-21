import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";

import logo from "../assets/trucker_no_text.png";

const EXACT_DASHBOARD_ROUTES = new Set([
  "/dashboard/profile",
  "/dashboard/owner",
  "/dashboard/driver",
  "/dashboard/admin",
  "/dashboard/general",
]);

function navLinkClass({ isActive }) {
  return `sidebar-link ${isActive ? "sidebar-link-active" : ""}`;
}

function getSidebarStorageKey(role) {
  return `dashboardSidebarCollapsed:${role || "user"}`;
}

function getRoleLabel(role) {
  const roleLabels = {
    owner_profile: "Propietario",
    driver_profile: "Conductor",
    admin: "Administrador",
    user: "Usuario",
  };

  return roleLabels[role] || "Sin perfil";
}

function getSidebarGroups(role) {
  const baseGroups = {
    owner_profile: [
      {
        title: "Resumen",
        items: [{ to: "/dashboard/owner", label: "Panel principal", icon: "PN" }],
      },
      {
        title: "Operacion",
        items: [
          { to: "/dashboard/owner/routes", label: "Manifiestos", icon: "MF" },
          { to: "/dashboard/owner/expenses", label: "Gastos", icon: "GS" },
          { to: "/dashboard/owner/suppliers", label: "Proveedores", icon: "PR" },
          { to: "/dashboard/owner/vehicles", label: "Vehiculos", icon: "VH" },
          { to: "/dashboard/owner/drivers", label: "Conductores", icon: "CD" },
        ],
      },
      {
        title: "Cuenta",
        items: [{ to: "/dashboard/profile", label: "Mi perfil", icon: "PF" }],
      },
    ],
    driver_profile: [
      {
        title: "Resumen",
        items: [{ to: "/dashboard/driver", label: "Panel principal", icon: "PN" }],
      },
      {
        title: "Operacion",
        items: [{ to: "/dashboard/driver/manifests", label: "Mis manifiestos", icon: "MF" }],
      },
      {
        title: "Cuenta",
        items: [{ to: "/dashboard/profile", label: "Mi perfil", icon: "PF" }],
      },
    ],
    admin: [
      {
        title: "Paneles",
        items: [
          { to: "/dashboard/admin", label: "Panel admin", icon: "AD" },
          { to: "/dashboard/owner", label: "Panel owner", icon: "OW" },
          { to: "/dashboard/driver", label: "Panel driver", icon: "DR" },
        ],
      },
      {
        title: "Cuenta",
        items: [{ to: "/dashboard/profile", label: "Mi perfil", icon: "PF" }],
      },
    ],
    user: [
      {
        title: "Resumen",
        items: [{ to: "/dashboard/general", label: "Panel general", icon: "GN" }],
      },
      {
        title: "Cuenta",
        items: [{ to: "/dashboard/profile", label: "Mi perfil", icon: "PF" }],
      },
    ],
  };

  return baseGroups[role] || baseGroups.user;
}

export default function DashboardShell({ me, title, subtitle, onLogout, theme, onToggleTheme, children }) {
  const location = useLocation();
  const roleLabel = getRoleLabel(me?.role);
  const sidebarStorageKey = getSidebarStorageKey(me?.role);
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 1024px)").matches;
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const storedValue = localStorage.getItem(sidebarStorageKey);
    return storedValue !== "false";
  });
  const sidebarGroups = getSidebarGroups(me?.role);
  const isSidebarCollapsed = !isMobile && isCollapsed;

  useEffect(() => {
    localStorage.setItem(sidebarStorageKey, String(isCollapsed));
  }, [isCollapsed, sidebarStorageKey]);

  useEffect(() => {
    const storedValue = localStorage.getItem(sidebarStorageKey);
    setIsCollapsed(storedValue !== "false");
  }, [sidebarStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const mediaQuery = window.matchMedia("(max-width: 1024px)");

    function handleMediaChange(event) {
      setIsMobile(event.matches);
      if (!event.matches) {
        setIsSidebarOpen(false);
      }
    }

    setIsMobile(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleMediaChange);

    return () => mediaQuery.removeEventListener("change", handleMediaChange);
  }, []);

  useEffect(() => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  }, [location.pathname, isMobile]);

  function toggleSidebar() {
    if (isMobile) {
      setIsSidebarOpen((prev) => !prev);
      return;
    }

    setIsCollapsed((prev) => !prev);
  }

  function handleSidebarItemClick() {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  }

  return (
    <section
      className={`dashboard-shell ${isSidebarCollapsed ? "dashboard-shell-collapsed" : ""} ${isSidebarOpen ? "dashboard-shell-sidebar-open" : ""}`}
    >

      <aside className={`dashboard-sidebar ${isSidebarCollapsed ? "dashboard-sidebar-collapsed" : ""}`} id="dashboard-sidebar" aria-hidden={isMobile && !isSidebarOpen}>
        <div className="sidebar-brand-block">
          <div className="sidebar-brand-row">
            <img className="sidebar-logo" src={logo} alt="Trucker" />
            <div className="sidebar-brand-actions">
              <button
                className="sidebar-toggle"
                type="button"
                onClick={toggleSidebar}
                aria-label={isMobile ? (isSidebarOpen ? "Cerrar sidebar" : "Abrir sidebar") : (isSidebarCollapsed ? "Expandir sidebar" : "Contraer sidebar")}
                aria-expanded={isMobile ? isSidebarOpen : !isSidebarCollapsed}
                aria-controls="dashboard-sidebar"
              >
                <span aria-hidden="true">{isMobile ? "x" : (isSidebarCollapsed ? ">" : "<")}</span>
              </button>
            </div>
          </div>
          <p className="sidebar-brand-copy">Control de operacion</p>
        </div>

        <nav className="sidebar-nav" aria-label="Navegacion de dashboard">
          {sidebarGroups.map((group) => (
            <div className="sidebar-group" key={group.title}>
              <p className="sidebar-group-title">{group.title}</p>
              <div className="sidebar-group-items">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    className={navLinkClass}
                    to={item.to}
                    end={EXACT_DASHBOARD_ROUTES.has(item.to)}
                    title={isSidebarCollapsed ? item.label : undefined}
                    data-tooltip={item.label}
                    aria-label={item.label}
                    onClick={handleSidebarItemClick}
                  >
                    <span className="sidebar-link-icon" aria-hidden="true">{item.icon}</span>
                    <span className="sidebar-link-label">{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="sidebar-theme-row">
          <button className="sidebar-theme-toggle" type="button" onClick={onToggleTheme} aria-label={`Cambiar a tema ${theme === "dark" ? "claro" : "oscuro"}`} title={isSidebarCollapsed ? `Tema ${theme === "dark" ? "claro" : "oscuro"}` : `Cambiar a tema ${theme === "dark" ? "claro" : "oscuro"}`} data-tooltip={`Tema ${theme === "dark" ? "oscuro" : "claro"}`}>
            <span className="sidebar-link-icon" aria-hidden="true">{theme === "dark" ? "☾" : "☼"}</span>
            <span className="sidebar-link-label">Tema {theme === "dark" ? "oscuro" : "claro"}</span>
          </button>
        </div>

        <div className="sidebar-actions">
          <button className="sidebar-logout" type="button" onClick={onLogout} title={isSidebarCollapsed ? "Cerrar sesion" : undefined} aria-label="Cerrar sesion" data-tooltip="Cerrar sesion">
            <span className="sidebar-action-icon" aria-hidden="true">⎋</span>
            <span className="sidebar-action-label">Cerrar sesion</span>
          </button>
        </div>
      </aside>

      {isMobile && isSidebarOpen ? (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Cerrar menu lateral"
          onClick={() => setIsSidebarOpen(false)}
        />
      ) : null}

      <div className="dashboard-content">
        <header className="dashboard-topbar">
          {isMobile ? (
            <button
              type="button"
              className="dashboard-mobile-menu"
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              aria-controls="dashboard-sidebar"
              aria-expanded={isSidebarOpen}
            >
              <span aria-hidden="true">☰</span>
              Menu
            </button>
          ) : null}
          <div className="dashboard-topbar-main">
            <div>
              <h2>{title}</h2>
              <p className="hint">{subtitle}</p>
            </div>
          </div>
          <span className="profile-chip">{roleLabel}</span>
        </header>

        {children}
      </div>
    </section>
  );
}
