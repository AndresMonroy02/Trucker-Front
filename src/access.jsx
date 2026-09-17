import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { api } from "./api";

/**
 * What the signed-in person may see and do, fetched from GET /me/access.
 *
 * The backend's permissions registry is the single source of truth: the sidebar,
 * the route guards and the read-only states all come from this one payload. That
 * is what makes adding a screen a one-line change on each side instead of an
 * edit in six places.
 */
// Exported so a test can render a screen with a known set of permissions instead
// of waiting on GET /me/access, which no server render ever performs.
export const AccessContext = createContext(null);

const EMPTY = { screens: [], permissions: [], role: null, roleLabel: null, loading: true };

export function AccessProvider({ token, me, children }) {
  const [access, setAccess] = useState(EMPTY);

  const load = useCallback(async () => {
    if (!token || !me || me.role !== "owner_profile") {
      setAccess({ ...EMPTY, loading: false });
      return;
    }
    try {
      const { data } = await api.get("/me/access");
      setAccess({
        screens: data.screens,
        permissions: data.permissions,
        role: data.role,
        roleLabel: data.role_label,
        accountId: data.account_id,
        loading: false,
      });
    } catch {
      // A member whose access was revoked mid-session lands here. Treat it as no
      // access rather than as the previous access.
      setAccess({ ...EMPTY, loading: false });
    }
  }, [token, me]);

  useEffect(() => {
    load();
  }, [load]);

  const value = useMemo(() => {
    const granted = new Set(access.permissions);
    const byKey = new Map(access.screens.map((screen) => [screen.key, screen]));
    return {
      ...access,
      reload: load,
      can: (permission) => granted.has(permission),
      canSee: (screenKey) => byKey.has(screenKey),
      canEdit: (screenKey) => Boolean(byKey.get(screenKey)?.can_write),
    };
  }, [access, load]);

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

export function useAccess() {
  const value = useContext(AccessContext);
  if (!value) {
    // Screens outside the owner dashboard (login, driver portal) render without
    // the provider; give them a permissive stub rather than crashing.
    return {
      screens: [], permissions: [], role: null, roleLabel: null, loading: false,
      can: () => true, canSee: () => true, canEdit: () => true, reload: () => {},
    };
  }
  return value;
}

/**
 * Hide editing controls the person cannot use.
 *
 *     <IfCanEdit screen="trips"><Button>Nuevo</Button></IfCanEdit>
 *
 * The API refuses the call regardless; this is so a Solo lectura user is not
 * shown buttons that will only ever fail.
 */
export function IfCanEdit({ screen, children, fallback = null }) {
  const access = useAccess();
  return access.canEdit(screen) ? children : fallback;
}
