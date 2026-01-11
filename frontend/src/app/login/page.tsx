"use client";

import { useState } from "react";
import { authService } from "@/services/auth.service";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await authService.login(email);

      if (res.role === "ADMIN") {
        router.push("/admin");
      } else {
        router.push("/assessment/start");
      }
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-white">
      <form
        onSubmit={handleLogin}
        className="bg-neutral-900 p-8 rounded-xl w-full max-w-md border border-neutral-800"
      >
        <h1 className="text-2xl font-bold mb-6 text-center">
          Assessment Login
        </h1>

        {error && (
          <div className="bg-red-500/10 text-red-400 p-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full p-3 rounded bg-neutral-800 border border-neutral-700 mb-4 focus:outline-none focus:border-yellow-500"
        />

        <button
          disabled={loading}
          className="w-full bg-yellow-500 text-black py-3 rounded font-semibold hover:bg-yellow-400 transition"
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
}
