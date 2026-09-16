import { lazy } from "react";

import {
  IconDashboard,
  IconMail,
  IconMoney,
  IconProfile,
  IconRoute,
  IconSupplier,
  IconTruck,
  IconUser,
  IconWallet,
} from "./components/icons";

/**
 * =========================================================================
 * THE FRONTEND HALF OF THE SCREEN REGISTRY.
 * =========================================================================
 *
 * To add a screen:
 *
 *   1. Add it to SCREENS in the backend's accounts/permissions.py -- that is
 *      what decides who may open it, and it carries the label and the path.
 *   2. Add one entry here, keyed by the same `key`, saying which component
 *      renders it and which icon the sidebar shows.
 *
 * Nothing else. The label, the path, the sidebar group and who can reach it all
 * come from GET /me/access, so this file never repeats them and the two halves
 * cannot drift into disagreeing about who sees what.
 *
 * A key present here but not in the backend registry is simply never rendered;
 * a key in the backend with no entry here is skipped with a console warning, so
 * a half-finished screen degrades instead of blanking the sidebar.
 */
export const SCREEN_COMPONENTS = {
  dashboard: { Icon: IconDashboard, Component: lazy(() => import("./pages/auth/OwnerDashboardPage")) },
  trips: { Icon: IconRoute, Component: lazy(() => import("./pages/owner/OwnerRoutesPage")) },
  expenses: { Icon: IconMoney, Component: lazy(() => import("./pages/owner/OwnerExpensesPage")) },
  finance: { Icon: IconWallet, Component: lazy(() => import("./pages/owner/OwnerFinancePage")) },
  suppliers: { Icon: IconSupplier, Component: lazy(() => import("./pages/owner/OwnerSuppliersPage")) },
  vehicles: { Icon: IconTruck, Component: lazy(() => import("./pages/owner/OwnerVehiclesPage")) },
  drivers: { Icon: IconUser, Component: lazy(() => import("./pages/owner/OwnerDriversPage")) },
  emails: { Icon: IconMail, Component: lazy(() => import("./pages/owner/OwnerEmailLogsPage")) },
  team: { Icon: IconProfile, Component: lazy(() => import("./pages/owner/OwnerTeamPage")) },
};

export function screenComponent(key) {
  const entry = SCREEN_COMPONENTS[key];
  if (!entry) {
    console.warn(`[screens] "${key}" is granted by the API but has no component registered`);
  }
  return entry;
}
