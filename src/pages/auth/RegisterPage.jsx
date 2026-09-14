import { Link, Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import AuthForm from "../../components/AuthForm";
import { api } from "../../api";
import { MIN_PASSWORD_LENGTH, parseApiFieldErrors, validateRegister } from "../../utils/validation";

// Registrarse crea siempre una cuenta de propietario: es el unico perfil que se
// crea solo. Los conductores los da de alta el propietario y reciben una
// invitacion por correo, y el administrador se asigna internamente.
const fields = [
  { name: "username", label: "Usuario", type: "text", placeholder: "sin espacios", required: true },
  { name: "email", label: "Correo", type: "email", placeholder: "tu@correo.com", required: true },
  { name: "password", label: "Contrasena", type: "password", placeholder: `minimo ${MIN_PASSWORD_LENGTH} caracteres`, required: true },
];

export default function RegisterPage({ token, values, setValues, errors, setErrors, redirectPath = "/dashboard" }) {
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

    const nextErrors = validateRegister(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      toast.error("Corrige los campos marcados.");
      return;
    }

    try {
      const { data } = await api.post("/auth/register", values);
      toast.success(`Usuario ${data.username} creado. Revisa tu correo para activar la cuenta.`);
      setValues({ username: "", email: "", password: "", role: "owner_profile" });
      navigate("/login");
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        setErrors(parseApiFieldErrors(detail));
        toast.error("Error de validacion. Revisa tus datos.");
      } else {
        toast.error(detail || "No se pudo registrar el usuario.");
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
