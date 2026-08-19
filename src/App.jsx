import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import { api, setAuthToken } from "./api";
import AdminDashboardPage from "./pages/owner/AdminDashboardPage";
import DashboardPage from "./pages/auth/DashboardPage";
import DriverDashboardPage from "./pages/driver/DriverDashboardPage";
import GeneralDashboardPage from "./pages/auth/GeneralDashboardPage";
import LoginPage from "./pages/auth/LoginPage";
import OwnerDriversPage from "./pages/owner/OwnerDriversPage";
import OwnerExpensesPage from "./pages/owner/OwnerExpensesPage";
import ProfilePage from "./pages/auth/ProfilePage";
import OwnerDashboardPage from "./pages/auth/OwnerDashboardPage";
import OwnerManifestDetailPage from "./pages/owner/OwnerManifestDetailPage";
import OwnerVehiclesPage from "./pages/owner/OwnerVehiclesPage";
import OwnerRoutesPage from "./pages/owner/OwnerRoutesPage";
import OwnerSuppliersPage from "./pages/owner/OwnerSuppliersPage";
import RegisterPage from "./pages/auth/RegisterPage";
import logo from "./assets/trucker_no_text.png";
import { getDashboardPathByRole } from "./utils/roleRouting";

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
  const [registerForm, setRegisterForm] = useState(EMPTY_REGISTER);
  const [loginForm, setLoginForm] = useState(EMPTY_LOGIN);
  const [registerErrors, setRegisterErrors] = useState({});
  const [loginErrors, setLoginErrors] = useState({});
  const [token, setTokenState] = useState(localStorage.getItem("token") || "");
  const [me, setMe] = useState(null);
  const [adminMessage, setAdminMessage] = useState("");
  const [status, setStatus] = useState({ success: "", error: "" });
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
      setStatus((prev) => ({ ...prev, error: "" }));
    } catch {
      setStatus({ success: "", error: "La sesion expiro. Vuelve a iniciar sesion." });
      setToken("");
    }
  }

  function handleLogin(tokenValue) {
    setToken(tokenValue);
    setLoginForm(EMPTY_LOGIN);
  }

  function logout() {
    setToken("");
    setStatus({ success: "Sesion cerrada.", error: "" });
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

        {status.success ? <p className="success">{status.success}</p> : null}
        {status.error ? <p className="error">{status.error}</p> : null}

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
                status={status}
                setStatus={setStatus}
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
                status={status}
                setStatus={setStatus}
                redirectPath={dashboardPath}
              />
            }
          />
          <Route
            path="/dashboard"
            element={<DashboardPage token={token} me={me} />}
          />
          <Route
            path="/dashboard/owner"
            element={
              <OwnerDashboardPage
                token={token}
                me={me}
                theme={theme}
                onToggleTheme={toggleTheme}
                setStatus={setStatus}
                onLogout={logout}
              />
            }
          />
          <Route
            path="/dashboard/owner/vehicles"
            element={
              <OwnerVehiclesPage
                token={token}
                me={me}
                theme={theme}
                onToggleTheme={toggleTheme}
                onLogout={logout}
              />
            }
          />
          <Route
            path="/dashboard/owner/drivers"
            element={
              <OwnerDriversPage
                token={token}
                me={me}
                theme={theme}
                onToggleTheme={toggleTheme}
                onLogout={logout}
              />
            }
          />
          <Route
            path="/dashboard/owner/routes"
            element={
              <OwnerRoutesPage
                token={token}
                me={me}
                theme={theme}
                onToggleTheme={toggleTheme}
                onLogout={logout}
              />
            }
          />
          <Route
            path="/dashboard/owner/routes/:manifestId"
            element={
              <OwnerManifestDetailPage
                token={token}
                me={me}
                theme={theme}
                onToggleTheme={toggleTheme}
                onLogout={logout}
              />
            }
          />
          <Route
            path="/dashboard/owner/suppliers"
            element={
              <OwnerSuppliersPage
                token={token}
                me={me}
                theme={theme}
                onToggleTheme={toggleTheme}
                onLogout={logout}
              />
            }
          />
          <Route
            path="/dashboard/owner/expenses"
            element={
              <OwnerExpensesPage
                token={token}
                me={me}
                theme={theme}
                onToggleTheme={toggleTheme}
                onLogout={logout}
              />
            }
          />
          <Route
            path="/dashboard/driver"
            element={
              <DriverDashboardPage
                token={token}
                me={me}
                theme={theme}
                onToggleTheme={toggleTheme}
                setStatus={setStatus}
                onLogout={logout}
              />
            }
          />
          <Route
            path="/dashboard/admin"
            element={
              <AdminDashboardPage
                token={token}
                me={me}
                adminMessage={adminMessage}
                setAdminMessage={setAdminMessage}
                theme={theme}
                onToggleTheme={toggleTheme}
                setStatus={setStatus}
                onLogout={logout}
              />
            }
          />
          <Route
            path="/dashboard/general"
            element={
              <GeneralDashboardPage
                token={token}
                me={me}
                theme={theme}
                onToggleTheme={toggleTheme}
                setStatus={setStatus}
                onLogout={logout}
              />
            }
          />
          <Route
            path="/dashboard/profile"
            element={
              <ProfilePage
                token={token}
                me={me}
                theme={theme}
                onToggleTheme={toggleTheme}
                onLogout={logout}
              />
            }
          />
        </Routes>
      </section>
    </main>
  );
}
