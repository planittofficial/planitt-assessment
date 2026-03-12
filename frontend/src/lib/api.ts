const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://planitt-assessment.onrender.com";

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

export async function apiFetch(
  path: string,
  options: RequestInit = {}
) {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

  const res = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include", // ⭐ sends cookies
    headers: {
      "Content-Type": "application/json",
      ...authHeader,
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    const contentType = res.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    const data: ApiErrorBody = isJson
      ? await res.json().catch(() => ({} as ApiErrorBody))
      : {};
    const text = isJson ? "" : await res.text().catch(() => "");
    const message =
      data.message ||
      text ||
      `Request failed (${res.status})`;
    throw new ApiError(message, res.status, data);
  }

  return res.json();
}
