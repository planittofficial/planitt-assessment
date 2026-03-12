export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-3xl font-bold">404 - Page Not Found</h1>
      <a className="text-blue-600 underline" href="/login">
        Return Login
      </a>
    </main>
  );
}
