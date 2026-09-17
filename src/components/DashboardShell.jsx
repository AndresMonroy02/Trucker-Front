import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";

import { BRAND_LOGO, BRAND_NAME } from "../brand";
import { useAccess } from "../access";
import { SCREEN_COMPONENTS } from "../screens";
import {
  IconChevronDown,
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

function slug(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function navLinkClass({ isActive }) {
  return `sidebar-link ${isActive ? "sidebar-link-active" : ""}`;
}

function getSidebarStorageKey(role) {
  return `dashboardSidebarCollapsed:${role || "user"}`;
}

function getGroupsStorageKey(role) {
  return `dashboardSidebarGroups:${role || "user"}`;
}

/**
 * Which groups the person has folded away.
 *
 * The *closed* ones are stored, not the open ones, so a group added to the
 * backend registry later shows up open -- nobody has to discover that a new
 * screen exists behind a heading they never opened.
 */
function readClosedGroups(role) {
  try {
    const stored = JSON.parse(localStorage.getItem(getGroupsStorageKey(role)) || "[]");
    return new Set(Array.isArray(stored) ? stored : []);
  } catch {
    return new Set();
  }
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

function getSidebarGroups(role, screens) {
  // The owner dashboard is built from GET /me/access, so a screen added to the
  // backend registry appears here for the roles that may open it -- without this
  // file knowing the screen exists. The other roles keep their fixed lists.
  if (role === "owner_profile") {
    const groups = [];
    screens.forEach((screen) => {
      const entry = SCREEN_COMPONENTS[screen.key];
      if (!entry) return;
      let group = groups.find((candidate) => candidate.title === screen.group);
      if (!group) {
        group = { title: screen.group, items: [] };
        groups.push(group);
      }
      group.items.push({ to: screen.path, label: screen.label, Icon: entry.Icon });
    });
    groups.push({
      title: "Cuenta",
      items: [{ to: "/dashboard/profile", label: "Mi perfil", Icon: IconProfile }],
    });
    // "Equipo" and "Mi perfil" both belong under Cuenta; merge rather than repeat it.
    const merged = [];
    groups.forEach((group) => {
      const existing = merged.find((candidate) => candidate.title === group.title);
      if (existing) existing.items.push(...group.items);
      else merged.push(group);
    });
    return merged;
  }

  const baseGroups = {
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

  return baseGroups[role] || [];
}

export default function DashboardShell({ me, title, subtitle, onLogout, theme, onToggleTheme, children }) {
  const location = useLocation();
  const roleLabel = getRoleLabel(me?.role);
  const sidebarStorageKey = getSidebarStorageKey(me?.role);
  const groupsStorageKey = getGroupsStorageKey(me?.role);

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

  const [closedGroups, setClosedGroups] = useState(() => readClosedGroups(me?.role));

  function toggleGroup(title) {
    setClosedGroups((previous) => {
      const next = new Set(previous);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  }

  const access = useAccess();
  const sidebarGroups = getSidebarGroups(me?.role, access.screens);
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
      localStorage.setItem(groupsStorageKey, JSON.stringify([...closedGroups]));
    } catch {
      // same: the preference just does not persist
    }
  }, [closedGroups, groupsStorageKey]);

  // Landing on a screen inside a folded group unfolds it. Reacting to the
  // navigation rather than forcing it open on every render: the fold is the
  // person's choice, and it survives until they go somewhere that contradicts it.
  useEffect(() => {
    const owning = sidebarGroups.find((group) =>
      group.items.some((item) => location.pathname === item.to)
    );
    if (!owning) return;
    setClosedGroups((previous) => {
      if (!previous.has(owning.title)) return previous;
      const next = new Set(previous);
      next.delete(owning.title);
      return next;
    });
  }, [location.pathname, sidebarGroups]);

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
            <img className="sidebar-logo" src={BRAND_LOGO} alt={BRAND_NAME} width="596" height="477" />
            <span className="sidebar-brand-text">
              <strong>{BRAND_NAME}</strong>
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
          {sidebarGroups.map((group) => {
            const links = group.items.map(({ to, label, Icon }) => (
              <NavLink
                key={to}
                className={navLinkClass}
                to={to}
                end={EXACT_DASHBOARD_ROUTES.has(to)}
                title={isSidebarCollapsed ? label : undefined}
                onClick={handleSidebarItemClick}
              >
                <Icon className="sidebar-glyph" />
                <span className="sidebar-link-label">{label}</span>
              </NavLink>
            ));

            // A heading you can fold away needs something worth folding. One item
            // renders as the link itself -- "Resumen > Panel principal" is two
            // rows to reach one screen.
            //
            // The narrow sidebar is icons only, where a heading has no room and a
            // folded group would hide items with nothing to say why.
            if (group.items.length < 2 || isSidebarCollapsed) {
              return (
                <div className="sidebar-group" key={group.title}>
                  {isSidebarCollapsed ? <p className="sidebar-group-title">{group.title}</p> : null}
                  <div className="sidebar-group-items">{links}</div>
                </div>
              );
            }

            const isOpen = !closedGroups.has(group.title);
            const regionId = `sidebar-group-${slug(group.title)}`;

            return (
              <div className="sidebar-group" key={group.title}>
                <button
                  type="button"
                  className="sidebar-group-toggle"
                  aria-expanded={isOpen}
                  aria-controls={regionId}
                  onClick={() => toggleGroup(group.title)}
                >
                  <span className="sidebar-group-title">{group.title}</span>
                  <IconChevronDown
                    className={`sidebar-group-chevron ${isOpen ? "" : "is-closed"}`}
                  />
                </button>
                <div className="sidebar-group-items" id={regionId} hidden={!isOpen}>
                  {links}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button
            className="sidebar-link sidebar-link-button"
            type="button"
            onClick={onToggleTheme}
            title={isSidebarCollapsed ? `Tema ${isDark ? "claro" : "oscuro"}` : undefined}
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
