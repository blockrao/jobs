"use client";

import Link from "next/link";

export default function JobsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-[60vh] bg-slate-50/70 px-4 py-16 sm:px-6">
      <section className="mx-auto max-w-2xl rounded-[2rem] border border-slate-200 bg-white px-6 py-10 text-center shadow-sm sm:px-10">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-700">
          JobOye · Job discovery
        </p>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
          We couldn&apos;t load the job listings
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-slate-600">
          The jobs service is temporarily unavailable. This does not mean there are no current opportunities. Please try again in a moment.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700"
          >
            Try again
          </button>
          <Link
            href="/government-jobs"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700"
          >
            Browse government jobs
          </Link>
        </div>
      </section>
    </main>
  );
}
