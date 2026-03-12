'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h2 className="text-2xl font-semibold">Something went wrong!</h2>
      <button
        className="rounded-md bg-black px-4 py-2 text-white"
        onClick={() => reset()}
      >
        Try again
      </button>
    </main>
  );
}
