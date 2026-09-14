import axios from "axios";

const API_BASE_URL = "http://127.0.0.1:8000";

export const api = axios.create({
  baseURL: API_BASE_URL,
});

export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

let unauthorizedHandler = null;

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && unauthorizedHandler) {
      unauthorizedHandler();
    }
    return Promise.reject(error);
  }
);

/**
 * Turn any axios failure into a string safe to hand to a toast.
 *
 * FastAPI answers 422 with `detail` as an ARRAY of issue objects, so the common
 * `err.response?.data?.detail || "..."` renders "[object Object]". This flattens
 * that case and falls back to the caller's message.
 */
export function getErrorMessage(err, fallback = "Ocurrio un error inesperado.") {
  const detail = err?.response?.data?.detail;
  if (typeof detail === "string" && detail.trim()) return detail;
  if (Array.isArray(detail)) {
    const messages = detail
      .map((issue) => (typeof issue === "string" ? issue : issue?.msg))
      .filter(Boolean);
    if (messages.length) return messages.join(" ");
  }
  if (detail && typeof detail === "object" && typeof detail.msg === "string") return detail.msg;
  if (err?.response?.status === 429) return "Demasiadas solicitudes. Intenta de nuevo en un momento.";
  if (err?.code === "ERR_NETWORK") return "No fue posible conectar con el servidor.";
  return fallback;
}

export function activateAccount(token) {
  return api.post("/auth/activate", { token });
}

export function setPasswordWithToken(token, newPassword) {
  return api.post("/auth/set-password", { token, new_password: newPassword });
}

export function resendActivation(username) {
  return api.post("/auth/resend-activation", { username });
}

export function sendDriverInvite(driverId) {
  return api.post(`/owner/drivers/${driverId}/send-invite`);
}

export function getInvitationStatus(token) {
  return api.get("/auth/invitation-status", { params: { token } });
}

export function fetchEmailLogs(params) {
  return api.get("/owner/email-logs", { params });
}

