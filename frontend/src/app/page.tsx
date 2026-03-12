"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/login");
  }, [router]);

  return (
    <main className="app-shell flex min-h-screen items-center justify-center px-6 py-10">
      <div className="hero-card relative z-10 flex w-full max-w-3xl flex-col items-center gap-6 rounded-[2rem] px-8 py-12 text-center sm:px-12">
        <div className="brand-kicker">Assessment Platform</div>
        <div className="text-3xl font-black tracking-[0.28em] text-stone-900 sm:text-4xl">
          PLANITT
        </div>
        <div className="space-y-3">
          <h1 className="text-3xl font-extrabold tracking-tight text-stone-900 sm:text-5xl">
            Preparing your assessment workspace
          </h1>
          <p className="mx-auto max-w-xl text-sm leading-6 text-stone-600 sm:text-base">
            Redirecting you to a calmer, clearer experience for candidates and admins.
          </p>
        </div>
      </div>
    </main>
  );
}

