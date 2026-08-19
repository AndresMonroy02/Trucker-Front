import { Link, Navigate } from "react-router-dom";
import { toast } from "sonner";

import AuthForm from "../../components/AuthForm";
import { api } from "../../api";
import { parseApiFieldErrors, validateLogin } from "../../utils/validation";

const fields = [
  { name: "username", label: "Usuario", type: "text", placeholder: "tu-usuario", required: true },
  { name: "password", label: "Contrasena", type: "password", placeholder: "******", required: true },
];

export default function LoginPage({ token, values, setValues, errors, setErrors, onLogin, redirectPath = "/dashboard" }) {
  if (token) {
    return <Navigate to={redirectPath} replace />;
  }

  function update(name, value) {
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const nextErrors = validateLogin(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      toast.error("Corrige los campos marcados.");
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
      toast.success("Inicio de sesion exitoso.");
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        setErrors(parseApiFieldErrors(detail));
        toast.error("Error de validacion. Revisa tus datos.");
      } else {
        toast.error(detail || "Usuario o contrasena incorrectos.");
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
