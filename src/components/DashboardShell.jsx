import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";

import logo from "../assets/trucker_no_text.png";
import {
  IconChevronLeft,
  IconChevronRight,
  IconClose,
  IconDashboard,
  IconLogout,
  IconMail,
  IconMenu,
  IconMoney,
  IconMoon,
  IconProfile,
  IconRoute,
  IconShield,
  IconSun,
  IconSupplier,
  IconTruck,
  IconUser,
  IconWallet,
} from "./icons";

const MOBILE_QUERY = "(max-width: 1024px)";

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
        items: [{ to: "/dashboard/owner", label: "Panel principal", Icon: IconDashboard }],
      },
      {
        title: "Operacion",
        items: [
          { to: "/dashboard/owner/routes", label: "Manifiestos", Icon: IconRoute },
          { to: "/dashboard/owner/expenses", label: "Gastos", Icon: IconMoney },
          { to: "/dashboard/owner/finance", label: "Cartera y anticipos", Icon: IconWallet },
          { to: "/dashboard/owner/suppliers", label: "Proveedores", Icon: IconSupplier },
          { to: "/dashboard/owner/vehicles", label: "Vehiculos", Icon: IconTruck },
          { to: "/dashboard/owner/drivers", label: "Conductores", Icon: IconUser },
          { to: "/dashboard/owner/emails", label: "Correos", Icon: IconMail },
        ],
      },
      {
        title: "Cuenta",
        items: [{ to: "/dashboard/profile", label: "Mi perfil", Icon: IconProfile }],
      },
    ],
    driver_profile: [
      {
        title: "Resumen",
        items: [{ to: "/dashboard/driver", label: "Panel principal", Icon: IconDashboard }],
      },
      {
        title: "Operacion",
        items: [{ to: "/dashboard/driver/manifests", label: "Mis manifiestos", Icon: IconRoute }],
      },
      {
        title: "Cuenta",
        items: [{ to: "/dashboard/profile", label: "Mi perfil", Icon: IconProfile }],
      },
    ],
    admin: [
      {
        title: "Paneles",
        items: [
          { to: "/dashboard/admin", label: "Panel admin", Icon: IconShield },
          { to: "/dashboard/owner", label: "Panel owner", Icon: IconDashboard },
          { to: "/dashboard/driver", label: "Panel driver", Icon: IconTruck },
        ],
      },
      {
        title: "Cuenta",
        items: [{ to: "/dashboard/profile", label: "Mi perfil", Icon: IconProfile }],
      },
    ],
    user: [
      {
        title: "Resumen",
        items: [{ to: "/dashboard/general", label: "Panel general", Icon: IconDashboard }],
      },
      {
        title: "Cuenta",
        items: [{ to: "/dashboard/profile", label: "Mi perfil", Icon: IconProfile }],
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
    return window.matchMedia(MOBILE_QUERY).matches;
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem(getSidebarStorageKey(me?.role)) === "true";
    } catch {
      return false;
    }
  });

  const sidebarGroups = getSidebarGroups(me?.role);
  const isSidebarCollapsed = !isMobile && isCollapsed;
  const isDark = theme === "dark";

  useEffect(() => {
    try {
      localStorage.setItem(sidebarStorageKey, String(isCollapsed));
    } catch {
      // private mode or blocked storage: the preference just does not persist
    }
  }, [isCollapsed, sidebarStorageKey]);

  useEffect(() => {
    try {
      setIsCollapsed(localStorage.getItem(sidebarStorageKey) === "true");
    } catch {
      setIsCollapsed(false);
    }
  }, [sidebarStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const mediaQuery = window.matchMedia(MOBILE_QUERY);

    function handleMediaChange(event) {
      setIsMobile(event.matches);
      if (!event.matches) setIsSidebarOpen(false);
    }

    setIsMobile(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleMediaChange);
    return () => mediaQuery.removeEventListener("change", handleMediaChange);
  }, []);

  // Close the drawer on navigation so a tap never leaves it covering the page.
  useEffect(() => {
    if (isMobile) setIsSidebarOpen(false);
  }, [location.pathname, isMobile]);

  // Escape closes the drawer, and the page underneath must not scroll behind it.
  useEffect(() => {
    if (!isMobile || !isSidebarOpen) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape") setIsSidebarOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobile, isSidebarOpen]);

  function handleSidebarItemClick() {
    if (isMobile) setIsSidebarOpen(false);
  }

  const shellClasses = [
    "dashboard-shell",
    isSidebarCollapsed ? "dashboard-shell-collapsed" : "",
    isSidebarOpen ? "dashboard-shell-sidebar-open" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={shellClasses}>
      <aside
        className="dashboard-sidebar"
        id="dashboard-sidebar"
        aria-hidden={isMobile && !isSidebarOpen}
      >
        <div className="sidebar-brand">
          <div className="sidebar-brand-identity">
            <img className="sidebar-logo" src={logo} alt="Trucker" width="596" height="477" />
            <span className="sidebar-brand-text">
              <strong>Trucker</strong>
              <small>Control de operacion</small>
            </span>
          </div>

          {isMobile ? (
            <button
              className="sidebar-icon-button"
              type="button"
              onClick={() => setIsSidebarOpen(false)}
              aria-label="Cerrar menu"
            >
              <IconClose className="sidebar-glyph" />
            </button>
          ) : null}
        </div>

        {!isMobile ? (
          <button
            className="sidebar-collapse-button"
            type="button"
            onClick={() => setIsCollapsed((prev) => !prev)}
            aria-label={isSidebarCollapsed ? "Expandir menu" : "Contraer menu"}
            aria-expanded={!isSidebarCollapsed}
            aria-controls="dashboard-sidebar"
            title={isSidebarCollapsed ? "Expandir menu" : "Contraer menu"}
          >
            {isSidebarCollapsed ? (
              <IconChevronRight className="sidebar-glyph" />
            ) : (
              <IconChevronLeft className="sidebar-glyph" />
            )}
            <span className="sidebar-collapse-label">Contraer</span>
          </button>
        ) : null}

        <nav className="sidebar-nav" aria-label="Navegacion de dashboard">
          {sidebarGroups.map((group) => (
            <div className="sidebar-group" key={group.title}>
              <p className="sidebar-group-title">{group.title}</p>
              <div className="sidebar-group-items">
                {group.items.map(({ to, label, Icon }) => (
                  <NavLink
                    key={to}
                    className={navLinkClass}
                    to={to}
                    end={EXACT_DASHBOARD_ROUTES.has(to)}
                    title={isSidebarCollapsed ? label : undefined}
                    data-tooltip={label}
                    onClick={handleSidebarItemClick}
                  >
                    <Icon className="sidebar-glyph" />
                    <span className="sidebar-link-label">{label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button
            className="sidebar-link sidebar-link-button"
            type="button"
            onClick={onToggleTheme}
            title={isSidebarCollapsed ? `Tema ${isDark ? "claro" : "oscuro"}` : undefined}
            data-tooltip={`Tema ${isDark ? "claro" : "oscuro"}`}
            aria-label={`Cambiar a tema ${isDark ? "claro" : "oscuro"}`}
          >
            {isDark ? <IconSun className="sidebar-glyph" /> : <IconMoon className="sidebar-glyph" />}
            <span className="sidebar-link-label">Tema {isDark ? "claro" : "oscuro"}</span>
          </button>

          <button
            className="sidebar-link sidebar-link-button sidebar-link-danger"
            type="button"
            onClick={onLogout}
            title={isSidebarCollapsed ? "Cerrar sesion" : undefined}
            data-tooltip="Cerrar sesion"
            aria-label="Cerrar sesion"
          >
            <IconLogout className="sidebar-glyph" />
            <span className="sidebar-link-label">Cerrar sesion</span>
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
              aria-label="Abrir menu"
            >
              <IconMenu className="sidebar-glyph" />
            </button>
          ) : null}

          <div className="dashboard-topbar-main">
            <h2>{title}</h2>
            {subtitle ? <p className="hint">{subtitle}</p> : null}
          </div>

          <span className="profile-chip">{roleLabel}</span>
        </header>

        {children}
      </div>
    </section>
  );
}
