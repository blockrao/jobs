import Link from "next/link";

// The 404 message, without any <html>/<body>: this component never creates
// a document of its own. It is rendered by each root layout's not-found.tsx
// (inside that tree's shell) and by src/app/global-not-found.tsx.
export function NotFoundContent() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-white">
      <div className="text-center max-w-md px-4">
        <div className="text-6xl mb-4">🔍</div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Page not found
        </h1>
        <p className="text-gray-600 mb-8">
          We couldn't find the page you were looking for. It might have been
          moved, deleted, or the link might be incorrect.
        </p>

        <div className="space-y-3">
          <div>
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Return to Home
            </Link>
          </div>

          <nav className="flex flex-col gap-2 pt-4">
            <Link
              href="/search"
              className="text-blue-600 hover:underline text-sm"
            >
              Search Jobs
            </Link>
            <Link
              href="/jobs"
              className="text-blue-600 hover:underline text-sm"
            >
              Browse All Jobs
            </Link>
            <Link
              href="/exams"
              className="text-blue-600 hover:underline text-sm"
            >
              Exams & Commissions
            </Link>
          </nav>
        </div>
      </div>
    </main>
  );
}
