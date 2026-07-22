import { Link, Navigate, useNavigate } from "react-router-dom";

import AuthForm from "../../components/AuthForm";
import { api } from "../../api";
import { parseApiFieldErrors, validateRegister } from "../../utils/validation";

const fields = [
  { name: "username", label: "Usuario", type: "text", placeholder: "tu-usuario", required: true },
  { name: "email", label: "Correo", type: "email", placeholder: "tu@correo.com", required: true },
  { name: "password", label: "Contrasena", type: "password", placeholder: "minimo 6 caracteres", required: true },
  {
    name: "role",
    label: "Perfil",
    type: "select",
    options: [
      { value: "owner_profile", label: "Propietario" },
      { value: "driver_profile", label: "Conductor" },
    ],
  },
];

export default function RegisterPage({ token, values, setValues, errors, setErrors, status, setStatus, redirectPath = "/dashboard" }) {
  const navigate = useNavigate();

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

    const nextErrors = validateRegister(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setStatus({ error: "Corrige los campos marcados.", success: "" });
      return;
    }

    try {
      const { data } = await api.post("/auth/register", values);
      setStatus({ error: "", success: `Usuario ${data.username} creado. Inicia sesion.` });
      setValues({ username: "", email: "", password: "", role: "owner_profile" });
      navigate("/login");
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        setErrors(parseApiFieldErrors(detail));
        setStatus({ error: "Error de validacion. Revisa tus datos.", success: "" });
      } else {
        setStatus({ error: detail || "No se pudo registrar el usuario.", success: "" });
      }
    }
  }

  return (
    <AuthForm
      title="Crear cuenta"
      fields={fields}
      values={values}
      errors={errors}
      submitLabel="Registrarme"
      onChange={update}
      onSubmit={handleSubmit}
      footer={<p className="switch-link">Ya tienes cuenta? <Link to="/login">Entrar</Link></p>}
    />
  );
}
