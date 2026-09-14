import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import AuthForm from "../../components/AuthForm";
import { MIN_PASSWORD_LENGTH, validatePassword } from "../../utils/validation";
import { getErrorMessage, getInvitationStatus, setPasswordWithToken } from "../../api";

const fields = [
  { name: "new_password", label: "Nueva contrasena", type: "password", placeholder: `minimo ${MIN_PASSWORD_LENGTH} caracteres`, required: true },
  { name: "confirm_password", label: "Confirmar contrasena", type: "password", placeholder: "repite la contrasena", required: true },
];

const INVALID_MESSAGES = {
  expired: "El enlace vencio. Pide a tu transportador que te reenvie la invitacion.",
  used: "Este enlace ya fue utilizado. Inicia sesion con tu contrasena.",
  revoked: "Este enlace fue reemplazado por una invitacion mas reciente. Revisa tu correo.",
  invalid: "El enlace de invitacion no es valido.",
};

export default function SetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const [values, setValues] = useState({ new_password: "", confirm_password: "" });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("checking");
  const [invalidMessage, setInvalidMessage] = useState("");
  const checkedRef = useRef(false);

  // Validate the link before asking for a password, so a dead link is not discovered
  // only after the user has typed one twice.
  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;

    if (!token) {
      setStatus("invalid");
      setInvalidMessage(INVALID_MESSAGES.invalid);
      return;
    }

    getInvitationStatus(token)
      .then(({ data }) => {
        if (data.valid) {
          setStatus("ready");
          return;
        }
        setStatus("invalid");
        setInvalidMessage(INVALID_MESSAGES[data.reason] || INVALID_MESSAGES.invalid);
      })
      .catch(() => {
        // Network or server trouble: let the user try to submit anyway.
        setStatus("ready");
      });
  }, [token]);

  function update(name, value) {
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const nextErrors = {};
    const passwordError = validatePassword(values.new_password);
    if (passwordError) {
      nextErrors.new_password = passwordError;
    }
    if (values.confirm_password !== values.new_password) {
      nextErrors.confirm_password = "Las contrasenas no coinciden.";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      toast.error("Corrige los campos marcados.");
      return;
    }

    if (!token) {
      toast.error("El enlace no es valido.");
      return;
    }

    try {
      await setPasswordWithToken(token, values.new_password);
      toast.success("Contrasena creada correctamente. Ya puedes iniciar sesion.");
      navigate("/login");
    } catch (err) {
      toast.error(getErrorMessage(err, "No fue posible configurar la contrasena."));
    }
  }

  if (status === "checking") {
    return (
      <div className="panel">
        <h2>Configura tu contrasena</h2>
        <p className="hint">Validando el enlace...</p>
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className="panel">
        <h2>Configura tu contrasena</h2>
        <p className="field-error">{invalidMessage}</p>
        <p className="switch-link">
          <Link to="/login">Ir a iniciar sesion</Link>
        </p>
      </div>
    );
  }

  return (
    <AuthForm
      title="Configura tu contrasena"
      fields={fields}
      values={values}
      errors={errors}
      submitLabel="Guardar contrasena"
      onChange={update}
      onSubmit={handleSubmit}
      footer={<p className="switch-link">Ya tienes cuenta? <Link to="/login">Entrar</Link></p>}
    />
  );
}
