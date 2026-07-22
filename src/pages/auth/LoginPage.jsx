import { Link, Navigate } from "react-router-dom";

import AuthForm from "../../components/AuthForm";
import { api } from "../../api";
import { parseApiFieldErrors, validateLogin } from "../../utils/validation";

const fields = [
  { name: "username", label: "Usuario", type: "text", placeholder: "tu-usuario", required: true },
  { name: "password", label: "Contrasena", type: "password", placeholder: "******", required: true },
];

export default function LoginPage({ token, values, setValues, errors, setErrors, status, setStatus, onLogin, redirectPath = "/dashboard" }) {
  if (token) {
    return <Navigate to={redirectPath} replace />;
  }

  function update(name, value) {
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus({ error: "", success: "" });

    const nextErrors = validateLogin(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setStatus({ error: "Corrige los campos marcados.", success: "" });
      return;
    }

    try {
      const body = new URLSearchParams({
        username: values.username,
        password: values.password,
      });
      const { data } = await api.post("/auth/login", body, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      onLogin(data.access_token);
      setStatus({ error: "", success: "Inicio de sesion exitoso." });
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        setErrors(parseApiFieldErrors(detail));
        setStatus({ error: "Error de validacion. Revisa tus datos.", success: "" });
      } else {
        setStatus({ error: detail || "Usuario o contrasena incorrectos.", success: "" });
      }
    }
  }

  return (
    <AuthForm
      title="Iniciar sesion"
      fields={fields}
      values={values}
      errors={errors}
      submitLabel="Entrar"
      onChange={update}
      onSubmit={handleSubmit}
      footer={<p className="switch-link">No tienes cuenta? <Link to="/register">Crear una</Link></p>}
    />
  );
}
