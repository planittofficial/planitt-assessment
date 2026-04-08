const apiBaseUrlFromEnv = (process.env.NEXT_PUBLIC_API_URL || "").replace(
  /\/$/,
  ""
);

const fallbackApiBaseUrl =
  process.env.NODE_ENV === "development"
    ? "http://localhost:5000"
    : "https://planitt-assessment.onrender.com";

export const API_BASE_URL = apiBaseUrlFromEnv || fallbackApiBaseUrl;

type ApiErrorBody = {
  message?: string;
  [key: string]: unknown;
};

export class ApiError extends Error {
  status: number;
  data: ApiErrorBody;

  constructor(message: string, status: number, data: ApiErrorBody) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers = new Headers(options.headers);

  headers.set("Content-Type", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers,
  });

  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined") {
      // Keep client state consistent if a token is expired or invalid.
      localStorage.removeItem("token");
    }

    const contentType = res.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    const data: ApiErrorBody = isJson
      ? await res.json().catch(() => ({} as ApiErrorBody))
      : {};
    const text = isJson ? "" : await res.text().catch(() => "");
    const message = data.message || text || `Request failed (${res.status})`;

    throw new ApiError(message, res.status, data);
  }

  return res.json();
}
