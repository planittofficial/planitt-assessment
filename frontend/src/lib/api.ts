const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data: any) {
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
  const res = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include", // ⭐ sends cookies
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    const contentType = res.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    const data = isJson ? await res.json().catch(() => ({})) : {};
    const text = isJson ? "" : await res.text().catch(() => "");
    const message =
      (data as any).message ||
      text ||
      `Request failed (${res.status})`;
    throw new ApiError(message, res.status, data);
  }

  return res.json();
}
