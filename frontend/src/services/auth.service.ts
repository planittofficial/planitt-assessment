import { AuthLoginResponse, AuthUser } from "@/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://planitt-assessment.onrender.com";

export const authService = {
  async login(email: string): Promise<AuthLoginResponse> {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || "Login failed");
    }

    const data = (await res.json()) as AuthLoginResponse;
    if (data.token) {
      localStorage.setItem("token", data.token);
    }
    return data;
  },

  async me(): Promise<AuthUser> {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

    const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
      credentials: "include",
      headers: {
        ...authHeader,
      },
    });

    if (!res.ok) throw new Error("Unauthorized");
    return res.json() as Promise<AuthUser>;
  },

  async logout() {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

    await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
      headers: {
        ...authHeader,
      },
    });
    localStorage.removeItem("token");
  },
};
