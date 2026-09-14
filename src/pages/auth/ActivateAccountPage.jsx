import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { activateAccount } from "../../api";

export default function ActivateAccountPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("Activando tu cuenta...");
  const requestedRef = useRef(false);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("El enlace de activacion no es valido.");
      return;
    }
    if (requestedRef.current) return;
    requestedRef.current = true;

    activateAccount(token)
      .then(() => {
        setStatus("success");
        setMessage("Tu cuenta fue activada correctamente. Ya puedes iniciar sesion.");
      })
      .catch((err) => {
        setStatus("error");
        setMessage(err.response?.data?.detail || "No fue posible activar la cuenta.");
      });
  }, [token]);

  return (
    <div className="panel">
      <h2>Activacion de cuenta</h2>
      <p className={status === "error" ? "field-error" : "hint"}>{message}</p>
      {status !== "loading" && <p className="switch-link"><Link to="/login">Ir a iniciar sesion</Link></p>}
    </div>
  );
}
