import { notFound, permanentRedirect } from "next/navigation";
import { listCommissionsWithExams } from "@/lib/queries";
import { getExamBySlug } from "@/db/operations/get-exams";

// This file lives at src/app/[locale]/page.tsx — i.e. it shares a folder
// (and therefore Next's dynamic-segment name, "locale") with layout.tsx and
// the articles/exams/organizations/jobs subtrees below it, even though this
// route itself has nothing to do with Hindi/English locale routing. It used
// to be its own top-level route at src/app/[exam_slug]/page.tsx, with its
// own differently-named dynamic segment — but Next.js's App Router
// requires every dynamic folder at the same tree depth to share one
// parameter name (two sibling folders like `[exam_slug]` and `[locale]`
// under `src/app/` throw "You cannot use different slug names for the
// same dynamic path" the moment a real request needs routing — this
// doesn't show up in `next build`'s own output, only when `next dev` or
// `next start` actually serves a request, which is why it went unnoticed).
// It was merged into [locale]/page.tsx to satisfy that constraint.
//
// This route (bare `/{examSlug}`) is now legacy: it duplicated the newer,
// properly-localized exam page at /exams/{slug} (and /{locale}/exams/{slug}
// for Hindi) — same exam entity, three different canonical URLs, the older
// one built on an older query module with no Hindi support at all. Rather
// than delete it outright (an indexed or bookmarked /{examSlug} URL should
// still resolve), it now permanently redirects to the canonical page. Every
// internal link that used to point here has been updated to link to
// /exams/{slug} directly (see commissions/[commission_slug]/page.tsx),
// so this route only matters for old inbound links now.
export const revalidate = 300;

type Props = {
  params: Promise<{ locale: string }>;
};

// Keep prerendering every known exam slug as a static redirect, same set as
// before — this is cheap and means old links resolve instantly off the CDN
// rather than falling through to on-demand ISR.
export async function generateStaticParams() {
  try {
    const commissions = await listCommissionsWithExams();
    const params = [];
    for (const comm of commissions) {
      for (const exam of comm.exams) {
        params.push({ locale: exam.slug });
      }
    }
    return params;
  } catch {
    // Database unavailable during build - return empty array
    // Pages will be generated on-demand (ISR) instead
    return [];
  }
}

export default async function LegacyExamRedirect({ params }: Props) {
  const { locale: examSlug } = await params;

  // The segment is also used by the locale root route tree. Only known legacy
  // exam slugs may redirect; arbitrary unknown paths should remain real 404s
  // instead of creating redirect chains to another 404.
  // A genuine missing row is a 404. Database/connection errors must
  // propagate as server errors so monitoring can detect an outage; do not
  // disguise infrastructure failures as a missing exam.
  const exam = await getExamBySlug(examSlug);
  if (!exam) notFound();
  permanentRedirect(`/exams/${examSlug}`);
}
