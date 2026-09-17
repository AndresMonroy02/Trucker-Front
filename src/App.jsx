import { Suspense, lazy, useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { api, setAuthToken, setUnauthorizedHandler } from "./api";
import ActivateAccountPage from "./pages/auth/ActivateAccountPage";
import LoginPage from "./pages/auth/LoginPage";
import RequireAuth from "./components/RequireAuth";
import RegisterPage from "./pages/auth/RegisterPage";
import SetPasswordPage from "./pages/auth/SetPasswordPage";
import { BRAND_LOGO, BRAND_NAME } from "./brand";
import { getDashboardPathByRole } from "./utils/roleRouting";

// Route-level code splitting: the login screen no longer ships every dashboard.
import { AccessProvider } from "./access";
import OwnerScreens from "./OwnerScreens";

const AdminDashboardPage = lazy(() => import("./pages/owner/AdminDashboardPage"));
const DashboardPage = lazy(() => import("./pages/auth/DashboardPage"));
const DriverDashboardPage = lazy(() => import("./pages/driver/DriverDashboardPage"));
const DriverManifestDetailPage = lazy(() => import("./pages/driver/DriverManifestDetailPage"));
const DriverManifestsPage = lazy(() => import("./pages/driver/DriverManifestsPage"));
const GeneralDashboardPage = lazy(() => import("./pages/auth/GeneralDashboardPage"));
const ProfilePage = lazy(() => import("./pages/auth/ProfilePage"));
const OwnerManifestDetailPage = lazy(() => import("./pages/owner/OwnerManifestDetailPage"));

const EMPTY_REGISTER = {
  username: "",
  email: "",
  password: "",
  role: "owner_profile",
};

const EMPTY_LOGIN = {
  username: "",
  password: "",
};

function getInitialTheme() {
  const storedTheme = localStorage.getItem("theme");
  if (storedTheme === "light" || storedTheme === "dark") {
    return storedTheme;
  }

  if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }

  return "light";
}

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [registerForm, setRegisterForm] = useState(EMPTY_REGISTER);
  const [loginForm, setLoginForm] = useState(EMPTY_LOGIN);
  const [registerErrors, setRegisterErrors] = useState({});
  const [loginErrors, setLoginErrors] = useState({});
  const [token, setTokenState] = useState(localStorage.getItem("token") || "");
  const [me, setMe] = useState(null);
  const [adminMessage, setAdminMessage] = useState("");
  const [theme, setTheme] = useState(getInitialTheme);

  // Keep the axios header in sync with token on every render (not just in an effect) so
  // requests fired from child effects on the same mount never race ahead of authentication.
  setAuthToken(token);

  function setToken(nextToken) {
    setAuthToken(nextToken);
    if (nextToken) {
      localStorage.setItem("token", nextToken);
    } else {
      localStorage.removeItem("token");
    }
    setTokenState(nextToken);
  }

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setToken("");
      toast.error("La sesion expiro. Vuelve a iniciar sesion.");
      navigate("/login", { replace: true });
    });
  }, [navigate]);

  useEffect(() => {
    if (token) {
      fetchProfile();
    } else {
      setMe(null);
      setAdminMessage("");
    }
  }, [token]);

  async function fetchProfile() {
    try {
      const { data } = await api.get("/users/me");
      setMe(data);
    } catch {
      // handled globally by the unauthorized handler for 401s; other errors are ignored here
    }
  }

  /* El perfil es lo unico que puede cambiar la identidad de la sesion en marcha.
     Cambiar el usuario invalida el token -- su "sub" es el usuario -- asi que el
     backend devuelve uno nuevo y aqui se reemplaza antes de que salga la
     siguiente peticion. Sin token nuevo solo se refresca `me`. */
  function handleProfileSaved(user, nextToken) {
    setMe(user);
    if (nextToken) setToken(nextToken);
  }

  function handleLogin(tokenValue) {
    setToken(tokenValue);
    setLoginForm(EMPTY_LOGIN);
  }

  function logout() {
    setToken("");
    toast.success("Sesion cerrada.");
    navigate("/login", { replace: true });
  }

  function toggleTheme() {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  }

  const dashboardPath = getDashboardPathByRole(me?.role);
  const isDashboardRoute = location.pathname.startsWith("/dashboard");

  return (
    <AccessProvider token={token} me={me}>
    <main className={`page ${isDashboardRoute ? "page-dashboard" : ""}`}>
      <section className={`card ${isDashboardRoute ? "card-dashboard" : ""}`}>
        {!isDashboardRoute ? (
          <div className="card-header">
            <div className="auth-brand">
              <img className="auth-brand-logo" src={BRAND_LOGO} alt={BRAND_NAME} />
              <h1>{BRAND_NAME}</h1>
              <p className="hint">Accede con tu cuenta y gestiona tu operacion de transporte con una vista clara y centralizada.</p>
            </div>
            <button className="theme-toggle" onClick={toggleTheme} type="button">
              Tema: {theme === "light" ? "Claro" : "Oscuro"}
            </button>
          </div>
        ) : null}

        <Suspense fallback={<p className="hint">Cargando...</p>}>
        <Routes>
          <Route
            path="/"
            element={<Navigate to={token ? dashboardPath : "/login"} replace />}
          />
          <Route
            path="/login"
            element={
              <LoginPage
                token={token}
                values={loginForm}
                setValues={setLoginForm}
                errors={loginErrors}
                setErrors={setLoginErrors}
                onLogin={handleLogin}
                redirectPath={dashboardPath}
              />
            }
          />
          <Route
            path="/register"
            element={
              <RegisterPage
                token={token}
                values={registerForm}
                setValues={setRegisterForm}
                errors={registerErrors}
                setErrors={setRegisterErrors}
                redirectPath={dashboardPath}
              />
            }
          />
          <Route path="/activate" element={<ActivateAccountPage />} />
          <Route path="/set-password" element={<SetPasswordPage />} />
          <Route
            path="/dashboard"
            element={
              <RequireAuth token={token} me={me}>
                <DashboardPage token={token} me={me} />
              </RequireAuth>
            }
          />
          {/* Every screen with a sidebar entry, generated from the registry the
              API serves at /me/access. Adding a screen means adding it there and
              in src/screens.jsx -- not here. */}
          <Route
            path="/dashboard/owner/*"
            element={<OwnerScreens token={token} me={me} theme={theme} toggleTheme={toggleTheme} logout={logout} />}
          />
          <Route
            path="/dashboard/owner/routes/:manifestId"
            element={
              <RequireAuth token={token} me={me} role="owner_profile">
                <OwnerManifestDetailPage
                  token={token}
                  me={me}
                  theme={theme}
                  onToggleTheme={toggleTheme}
                  onLogout={logout}
                />
              </RequireAuth>
            }
          />
          <Route
            path="/dashboard/driver"
            element={
              <RequireAuth token={token} me={me} role="driver_profile">
                <DriverDashboardPage
                  token={token}
                  me={me}
                  theme={theme}
                  onToggleTheme={toggleTheme}
                  onLogout={logout}
                />
              </RequireAuth>
            }
          />
          <Route
            path="/dashboard/driver/manifests"
            element={
              <RequireAuth token={token} me={me} role="driver_profile">
                <DriverManifestsPage
                  token={token}
                  me={me}
                  theme={theme}
                  onToggleTheme={toggleTheme}
                  onLogout={logout}
                />
              </RequireAuth>
            }
          />
          <Route
            path="/dashboard/driver/manifests/:manifestId"
            element={
              <RequireAuth token={token} me={me} role="driver_profile">
                <DriverManifestDetailPage
                  token={token}
                  me={me}
                  theme={theme}
                  onToggleTheme={toggleTheme}
                  onLogout={logout}
                />
              </RequireAuth>
            }
          />
          <Route
            path="/dashboard/admin"
            element={
              <RequireAuth token={token} me={me} role="admin">
                <AdminDashboardPage
                  token={token}
                  me={me}
                  adminMessage={adminMessage}
                  setAdminMessage={setAdminMessage}
                  theme={theme}
                  onToggleTheme={toggleTheme}
                  onLogout={logout}
                />
              </RequireAuth>
            }
          />
          <Route
            path="/dashboard/general"
            element={
              <RequireAuth token={token} me={me} role="user">
                <GeneralDashboardPage
                  token={token}
                  me={me}
                  theme={theme}
                  onToggleTheme={toggleTheme}
                  onLogout={logout}
                />
              </RequireAuth>
            }
          />
          <Route
            path="/dashboard/profile"
            element={
              <RequireAuth token={token} me={me}>
                <ProfilePage
                  token={token}
                  me={me}
                  theme={theme}
                  onToggleTheme={toggleTheme}
                  onLogout={logout}
                  onProfileSaved={handleProfileSaved}
                />
              </RequireAuth>
            }
          />
        </Routes>
        </Suspense>
      </section>
    </main>
    </AccessProvider>
  );
}
