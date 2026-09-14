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

