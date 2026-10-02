import axios from "axios";

export const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
  timeout: 30000,
});
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      !["/login", "/register", "/me/password", "/auth/check"].includes(
        error.config?.url,
      )
    ) {
      window.dispatchEvent(new Event("abyuday:session-expired"));
    }
    return Promise.reject(error);
  },
);
export const errorMessage = (
  error,
  fallback = "Something went wrong. Please try again.",
) => error?.response?.data?.error || error?.response?.data?.message || fallback;
export const safeDestination = (value) =>
  typeof value === "string" &&
  /^\/(dashboard(?:[/?]|$)|test\?|join\?)/.test(value)
    ? value
    : "/dashboard";
export const formatDate = (value) =>
  value && !Number.isNaN(new Date(value).getTime())
    ? new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(value))
    : "—";
export async function copyText(value) {
  if (!navigator.clipboard)
    throw new Error(
      "Select and copy the text manually; clipboard access is unavailable.",
    );
  await navigator.clipboard.writeText(value);
}
