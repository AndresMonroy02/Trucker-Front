import { Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { useAccess } from "./access";
import { screenComponent } from "./screens";

const OWNER_PREFIX = "/dashboard/owner";

/**
 * Every owner screen, routed from the access payload.
 *
 * A person only gets routes for the screens their role may open, so a URL typed
 * by hand lands on the "sin acceso" notice rather than on a page whose every API
 * call would 403. Adding a screen means adding it to the backend registry and to
 * src/screens.jsx -- this file never changes.
 */
export default function OwnerScreens({ token, me, theme, toggleTheme, logout }) {
  const access = useAccess();

  if (access.loading) return null;

  const pageProps = { token, me, theme, onToggleTheme: toggleTheme, onLogout: logout };
  const routable = access.screens
    .map((screen) => ({ screen, entry: screenComponent(screen.key) }))
    .filter(({ entry }) => entry);

  const landing = routable[0]?.screen.path ?? "/dashboard/profile";

  return (
    <Suspense fallback={null}>
      <Routes>
        {routable.map(({ screen, entry }) => {
          const Component = entry.Component;
          // The parent route is "/dashboard/owner/*", so these are relative to it.
          const relative = screen.path === OWNER_PREFIX
            ? ""
            : screen.path.slice(OWNER_PREFIX.length + 1);
          return <Route key={screen.key} path={relative} element={<Component {...pageProps} />} />;
        })}
        <Route
          path="*"
          element={
            access.screens.length === 0
              ? <NoAccess />
              : <Navigate to={landing} replace />
          }
        />
      </Routes>
    </Suspense>
  );
}

function NoAccess() {
  return (
    <section className="panel">
      <h3>Sin acceso</h3>
      <p className="hint">
        Tu cuenta todavia no pertenece a ninguna empresa, o te retiraron el acceso.
        Pide a la persona propietaria que te invite de nuevo.
      </p>
    </section>
  );
}
