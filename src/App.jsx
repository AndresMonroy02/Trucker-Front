import { Suspense, lazy, useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { api, setAuthToken, setUnauthorizedHandler } from "./api";
import ActivateAccountPage from "./pages/auth/ActivateAccountPage";
import LoginPage from "./pages/auth/LoginPage";
import RequireAuth from "./components/RequireAuth";
import RegisterPage from "./pages/auth/RegisterPage";
import SetPasswordPage from "./pages/auth/SetPasswordPage";
import logo from "./assets/trucker_no_text.png";
import { getDashboardPathByRole } from "./utils/roleRouting";

// Route-level code splitting: the login screen no longer ships every dashboard.
const AdminDashboardPage = lazy(() => import("./pages/owner/AdminDashboardPage"));
const DashboardPage = lazy(() => import("./pages/auth/DashboardPage"));
const DriverDashboardPage = lazy(() => import("./pages/driver/DriverDashboardPage"));
const DriverManifestDetailPage = lazy(() => import("./pages/driver/DriverManifestDetailPage"));
const DriverManifestsPage = lazy(() => import("./pages/driver/DriverManifestsPage"));
const GeneralDashboardPage = lazy(() => import("./pages/auth/GeneralDashboardPage"));
const OwnerDriversPage = lazy(() => import("./pages/owner/OwnerDriversPage"));
const OwnerExpensesPage = lazy(() => import("./pages/owner/OwnerExpensesPage"));
const ProfilePage = lazy(() => import("./pages/auth/ProfilePage"));
const OwnerDashboardPage = lazy(() => import("./pages/auth/OwnerDashboardPage"));
const OwnerManifestDetailPage = lazy(() => import("./pages/owner/OwnerManifestDetailPage"));
const OwnerVehiclesPage = lazy(() => import("./pages/owner/OwnerVehiclesPage"));
const OwnerRoutesPage = lazy(() => import("./pages/owner/OwnerRoutesPage"));
const OwnerSuppliersPage = lazy(() => import("./pages/owner/OwnerSuppliersPage"));
const OwnerEmailLogsPage = lazy(() => import("./pages/owner/OwnerEmailLogsPage"));

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
    <main className={`page ${isDashboardRoute ? "page-dashboard" : ""}`}>
      <section className={`card ${isDashboardRoute ? "card-dashboard" : ""}`}>
        {!isDashboardRoute ? (
          <div className="card-header">
            <div className="auth-brand">
              <img className="auth-brand-logo" src={logo} alt="Trucker" />
              <h1>Trucker</h1>
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
          <Route
            path="/dashboard/owner"
            element={
              <RequireAuth token={token} me={me} role="owner_profile">
                <OwnerDashboardPage
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
            path="/dashboard/owner/vehicles"
            element={
              <RequireAuth token={token} me={me} role="owner_profile">
                <OwnerVehiclesPage
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
            path="/dashboard/owner/drivers"
            element={
              <RequireAuth token={token} me={me} role="owner_profile">
                <OwnerDriversPage
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
            path="/dashboard/owner/routes"
            element={
              <RequireAuth token={token} me={me} role="owner_profile">
                <OwnerRoutesPage
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
            path="/dashboard/owner/suppliers"
            element={
              <RequireAuth token={token} me={me} role="owner_profile">
                <OwnerSuppliersPage
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
            path="/dashboard/owner/emails"
            element={
              <RequireAuth token={token} me={me} role="owner_profile">
                <OwnerEmailLogsPage
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
            path="/dashboard/owner/expenses"
            element={
              <RequireAuth token={token} me={me} role="owner_profile">
                <OwnerExpensesPage
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
                />
              </RequireAuth>
            }
          />
        </Routes>
        </Suspense>
      </section>
    </main>
  );
}
