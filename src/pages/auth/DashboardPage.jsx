import { Navigate } from "react-router-dom";

import { getDashboardPathByRole } from "../../utils/roleRouting";

export default function DashboardPage({ token, me }) {
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (!me) {
    return <section className="panel"><p className="hint">Cargando perfil...</p></section>;
  }

  return <Navigate to={getDashboardPathByRole(me.role)} replace />;
}
