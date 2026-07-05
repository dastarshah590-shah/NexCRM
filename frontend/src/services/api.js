const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "/api" : "http://localhost:5000/api");
const TOKEN_KEY = "nexcrm_token";

export const getStoredToken = () => localStorage.getItem(TOKEN_KEY);
export const storeToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearStoredToken = () => localStorage.removeItem(TOKEN_KEY);

const buildHeaders = (options = {}) => {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return headers;
};

export const apiRequest = async (path, options = {}) => {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: buildHeaders(options),
    body: options.body && typeof options.body !== "string" ? JSON.stringify(options.body) : options.body
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : null;

  if (!response.ok) {
    const error = new Error(payload?.message || "Request failed");
    error.status = response.status;
    error.details = payload?.details;
    throw error;
  }

  return payload;
};

export const api = {
  get: (path) => apiRequest(path),
  post: (path, body) => apiRequest(path, { method: "POST", body }),
  put: (path, body) => apiRequest(path, { method: "PUT", body }),
  patch: (path, body) => apiRequest(path, { method: "PATCH", body }),
  delete: (path) => apiRequest(path, { method: "DELETE" })
};
