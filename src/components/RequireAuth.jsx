import { Navigate } from "react-router-dom";

import { getDashboardPathByRole } from "../utils/roleRouting";

/**
 * Route guard. Wrapping the route means the page component never mounts without a
 * token, so pages can call their hooks unconditionally.
 *
 * Previously every page repeated this check *inside* itself, after its hooks - an
 * early return that skipped the remaining hooks and made React throw
 * "rendered fewer hooks than expected" when the token disappeared on logout.
 */
export default function RequireAuth({ token, me, role, children }) {
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // `me` arrives a tick after the token; render the page until the role is known.
  if (role && me && me.role !== role) {
    return <Navigate to={getDashboardPathByRole(me.role)} replace />;
  }

  return children;
}
