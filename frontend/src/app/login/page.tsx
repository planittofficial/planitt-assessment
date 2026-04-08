"use client";

import { useState } from "react";
import { authService } from "@/services/auth.service";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAdminLogin, setIsAdminLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await authService.login(
        email,
        isAdminLogin ? password : undefined
      );

      if (res.role === "ADMIN") {
        router.push("/admin");
      } else {
        router.push("/assessment/start");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app-shell flex min-h-screen items-center justify-center px-4 py-10 text-stone-900">
      <div className="relative z-10 grid w-full max-w-6xl gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="hero-card overflow-hidden rounded-[2rem] px-6 py-8 sm:px-10 sm:py-12">
          <div className="mb-8 flex items-center justify-between gap-4">
            <div className="brand-kicker">Planitt Hiring Flow</div>
            <div className="rounded-full border border-white/60 bg-white/70 px-4 py-2 text-xs font-semibold tracking-[0.2em] text-stone-500 uppercase">
              Candidate Portal
            </div>
          </div>

          <div className="max-w-2xl space-y-6">
            <div className="text-3xl font-black tracking-[0.28em] text-stone-950 sm:text-4xl">
              PLANITT
            </div>
            <div className="space-y-4">
              <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-stone-950 sm:text-6xl">
                Make assessments feel polished before the first question appears.
              </h1>
              <p className="max-w-xl text-base leading-7 text-stone-600 sm:text-lg">
                A friendlier, more premium candidate experience with clearer entry points,
                softer visuals, and less visual friction.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                ["Fast entry", "Single-step login and clean navigation."],
                ["Lower stress", "Warm visual tone with clearer hierarchy."],
                ["Admin ready", "Same design language across the console."],
              ].map(([title, copy]) => (
                <div
                  key={title}
                  className="rounded-[1.5rem] border border-stone-200/80 bg-white/75 p-4 shadow-sm backdrop-blur"
                >
                  <p className="mb-2 text-sm font-extrabold text-stone-900">{title}</p>
                  <p className="text-sm leading-6 text-stone-600">{copy}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <form
          onSubmit={handleLogin}
          className="hero-card my-auto w-full rounded-[2rem] p-6 sm:p-8"
        >
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-stone-500">
              Sign In
            </p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-stone-950">
              Start your assessment
            </h2>
            <p className="mt-3 text-sm leading-6 text-stone-600">
              Use the email address assigned to your assessment profile.
            </p>
          </div>

          {error && <div className="status-note error mb-4">{error}</div>}

          <label className="mb-3 block text-sm font-semibold text-stone-700">
            Email address
          </label>
          <input
            type="email"
            placeholder="candidate@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="field-input mb-5 px-4 py-3.5 text-base"
          />

          <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-700">
            <input
              type="checkbox"
              checked={isAdminLogin}
              onChange={(e) => {
                setIsAdminLogin(e.target.checked);
                if (!e.target.checked) {
                  setPassword("");
                }
              }}
              className="h-4 w-4 rounded border-stone-300 accent-[#c77131]"
            />
            Login as admin
          </label>

          {isAdminLogin && (
            <>
              <label className="mb-3 block text-sm font-semibold text-stone-700">
                Admin password
              </label>
              <input
                type="password"
                placeholder="Enter shared admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={isAdminLogin}
                className="field-input mb-5 px-4 py-3.5 text-base"
                autoComplete="current-password"
              />
            </>
          )}

          <button
            disabled={loading}
            className="primary-button w-full px-6 py-3.5 text-base"
          >
            {loading ? "Entering..." : "Enter assessment"}
          </button>

          <div className="mt-6 rounded-2xl border border-amber-200/70 bg-amber-50/90 px-4 py-4 text-sm leading-6 text-amber-900">
            Candidates only need email. Admin users must enable admin login and enter the shared password.
          </div>
        </form>
      </div>
    </main>
  );
}
