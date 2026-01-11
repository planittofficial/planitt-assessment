const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export const authService = {
  async login(email: string) {
    const res = await fetch("http://localhost:5000/api/auth/login", {
      method: "POST",
      credentials: "include", // ⭐ REQUIRED
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || "Login failed");
    }

    return res.json();
  },

  async me() {
    const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
      credentials: "include",
    });

    if (!res.ok) throw new Error("Unauthorized");
    return res.json();
  },

  async logout() {
    await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  },
};
console.log("API URL:", process.env.NEXT_PUBLIC_API_URL);
