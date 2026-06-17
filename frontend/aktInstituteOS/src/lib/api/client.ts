import axios from "axios";

// In the browser, use "" (same origin) so Next.js rewrites forward to the backend.
// NEXT_PUBLIC_API_URL can override for direct backend calls (e.g. SSR, tests).
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "",
  headers: { "Content-Type": "application/json" },
  withCredentials: true, // send httpOnly refresh-token cookie
});

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

// Callback invoked after a successful silent token refresh in the 401 interceptor.
// Allows the auth store to update tokenExpiresAt without a circular import.
let onTokenRefreshed: ((token: string, expiresIn: number) => void) | null = null;
export function setOnTokenRefreshed(cb: ((token: string, expiresIn: number) => void) | null) {
  onTokenRefreshed = cb;
}

// Inject Bearer token on every request
apiClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

function processQueue(token: string | null) {
  refreshQueue.forEach((cb) => cb(token));
  refreshQueue = [];
}

// On 401, attempt silent refresh then retry original request
apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    // Auth endpoints must never trigger the refresh loop — pass the error straight through
    // so the login form's own catch block can handle it and show an inline message.
    const url: string = original.url ?? "";
    if (url.includes("/auth/login") || url.includes("/auth/refresh")) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push((token) => {
          if (token) {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(apiClient(original));
          } else {
            reject(error);
          }
        });
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const { data } = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL ?? ""}/api/v1/auth/refresh`,
        {},
        { withCredentials: true }
      );
      const newToken: string = data.data.accessToken;
      const expiresIn: number = data.data.expiresIn ?? 0;
      setAccessToken(newToken);
      onTokenRefreshed?.(newToken, expiresIn);
      processQueue(newToken);
      original.headers.Authorization = `Bearer ${newToken}`;
      return apiClient(original);
    } catch {
      setAccessToken(null);
      processQueue(null);
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      return Promise.reject(error);
    } finally {
      isRefreshing = false;
    }
  }
);

export default apiClient;
