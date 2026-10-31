/**
 * Job Detail Page (post leaf) — server-rendered
 *
 * Route: /jobs/[recruitment-slug]/[post-slug]
 *
 * Structure (2026-10-21, "simple, SEO-first" template):
 *   breadcrumb → H1 → meta line → status line → intro → Short Details table →
 *   Apply / Notification buttons → one H2 section per topic (each a table or a
 *   list) → Important links → FAQ → Related → Disclaimer.
 *
 * Rules:
 *   - Renders inside the RootShell (which owns <header>, <main>, <footer>);
 *     this component never renders its own site header or <main>.
 *   - Every fact on the page comes from stored data; nothing is templated or
 *     defaulted. A section renders only when it has data.
 *   - The FAQ list and the fact lines are computed once and handed to the
 *     structured-data component, so JSON-LD mirrors the visible page exactly.
 *   - JobPosting is gated on lifecycle only: a closed recruitment with no
 *     verifiable deadline emits no JobPosting (Google forbids live expired
 *     postings without a past validThrough).
 *   - Uses the recruitment hub's stylesheet so hub and leaf look identical.
 */

import Link from 'next/link';
import { formatDate, formatCurrency } from '@/lib/formatting';
import JobPostingSchema from '@/components/job-posting/structured-data/post-leaf-schema';
import type { LeafFaq, LeafFact } from '@/components/job-posting/structured-data/post-leaf-schema';
import { toPlausibleRecruitmentDate } from '@/lib/recruitment-dates';
import styles from '@/components/recruitment/recruitment-hub.module.css';

// Helper: Parse JSON strings safely
function safeJsonParse<T>(value: unknown, fallback: T): T {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return value as T;
}

interface RelatedPost {
  title: string;
  slug: string;
  recruitment_slug: string;
}

interface JobDetailPageProps {
  post: {
    id: string | number;
    title: string;
    description?: string | null;
    organizationName?: string | null;
    organizationType?: string | null;
    organizationWebsite?: string | null;
    locationCity?: string | null;
    locationState?: string | null;
    recruitmentSlug: string;
    recruitmentName?: string | null;
    slug: string;
    postedAt?: Date | string | null;
    updatedAt?: Date | string | null;
    notificationPublicationDate?: Date | string | null;
    officialSourceUrl?: string | null;
    applyUrl?: string | null;
    employmentType?: string | null;
    qualificationText?: string | null;
    experienceText?: string | null;
    ageLimit?: string | null;
    selectionProcess?: string | null;
    howToApply?: string | null;
    applicationFee?: string | null;
    salary?: { min: number | null; max: number | null };
    vacancies?: number | null;
    applicationDeadline?: Date | string | null;
    vacanciesByCategory?: Array<{ category: string; total: number; location?: string }>;
    educationRequirements?: Array<{ degree: string; subject?: string; specialization?: string; minimumPercentage?: number; minimumMarks?: number; confidenceScore?: number }>;
    experienceRequirements?: Array<{ totalYears?: number; minYears?: number; type: string; confidenceScore?: number }>;
    selectionProcessStages?: Array<{ order: number; name: string; scheduledDate?: string; durationMinutes?: number; totalMarks?: number; minimumMarks?: number }>;
    requiredDocuments?: Array<{ name: string; category: string; isRequired: boolean }>;
    importantDates?: Array<{ type: string; date: string }>;
    ageRules?: Array<{ category: string; maxAge?: number; relaxationYears?: number; ruleType: string; note?: string }>;
    applicationFees?: Array<{ amount?: number | null; currency?: string; waivedFor?: string; paymentMethods?: string; note?: string }>;
    officialLinks?: Array<{ type?: string; url?: string; title?: string; source?: string }>;
    fjaExtract?: {
      qualificationRaw?: string | null;
      experienceRaw?: string | null;
      advertisementNumber?: string | null;
      ageRaw?: string | null;
      salaryRaw?: string | null;
    };
  };
  relatedJobs?: Array<{ id: string; title: string; slug: string; recruitmentSlug: string; applicationDeadline?: Date | string | null }>;
  relatedByOrg?: RelatedPost[];
  relatedByLocation?: RelatedPost[];
  relatedByRole?: RelatedPost[];
  /** Pre-composed FAQ items; when absent they are derived from stored facts. */
  faqs?: Array<{ question: string; answer: string }>;
  locale?: string;
  /** Kept for the route contract; the schema builds URLs from recruitmentSlug/slug. */
  canonicalUrl?: string;
  /** Page <title>/description from the route, so JSON-LD never disagrees with <head>. */
  pageTitle?: string;
  pageDescription?: string;
  lifecycle?: { state: string; isOpen: boolean; isLive: boolean; deadline: Date | null; daysLeft: number | null };
  /** Source issuer and fact review must pass before JobPosting is emitted. */
  sourceVerified?: boolean;
  /** Source issuer and fact review must pass before JobPosting is emitted. */
  sourceVerified?: boolean;
  /** Mirrors route-level robots eligibility; prevents JobPosting on noindex leaves. */
  indexable?: boolean;
  pillarSlug?: string | null;
}

const EMPLOYMENT_LABELS: Record<string, string> = {
  FULL_TIME: 'Full-time', PART_TIME: 'Part-time', CONTRACT: 'Contract', CONTRACTUAL: 'Contract',
  CONTRACTOR: 'Contract', INTERN: 'Internship', INTERNSHIP: 'Internship', TEMPORARY: 'Temporary',
  APPRENTICESHIP: 'Apprenticeship', DEPUTATION: 'Deputation', FELLOWSHIP: 'Fellowship', PERMANENT: 'Permanent',
};

const inr = (n: number) => `₹${formatCurrency(n)}`;

const linkLabel = (link: { type?: string; title?: string }): string =>
  link.title
  ?? ({ apply_online: 'Apply online', official_notification: 'Official notification', official_website: 'Official website', syllabus: 'Syllabus', admit_card: 'Admit card', result: 'Result' } as Record<string, string>)[link.type ?? '']
  ?? (link.type ? link.type.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'Link');

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className={styles.card}>
      <h2 id={`${id}-heading`} className={styles.sectionTitle}>{title}</h2>
      {children}
    </section>
  );
}

export default function JobDetailPageProduction({
  post,
  relatedJobs,
  relatedByOrg,
  relatedByLocation,
  relatedByRole,
  faqs,
  locale = 'en',
  pageTitle,
  pageDescription,
  lifecycle,
  indexable = true,
  sourceVerified = false,
  pillarSlug,
}: JobDetailPageProps) {
  // ── Normalise ────────────────────────────────────────────────────────────
  const vacancies = post.vacancies ?? 0;
  const salaryMin = post.salary?.min ?? null;
  const salaryMax = post.salary?.max ?? null;
  const applicationDeadline = lifecycle ? lifecycle.deadline : toPlausibleRecruitmentDate(post.applicationDeadline ?? null);
  // "Live" includes upcoming recruitments, but "open" means candidates can
  // submit an application now. Keep those states separate: an upcoming page
  // may be visible, but must not show an Apply CTA or emit JobPosting markup.
  const isApplicationOpen = lifecycle ? lifecycle.isOpen : !(applicationDeadline && new Date() > applicationDeadline);
  const recruitmentClosed = lifecycle ? lifecycle.state === 'closed' || lifecycle.state === 'results' || lifecycle.state === 'archived' : false;
  const isApplicationClosed = !isApplicationOpen;
  // JobPosting is only for an application that is currently open. The schema
  // builder independently omits markup for a known expired deadline.
  const emitJobPosting = sourceVerified && (lifecycle ? lifecycle.isOpen : !isApplicationClosed);
  const deadlineStatusText = !applicationDeadline
    ? null
    : lifecycle?.state === 'upcoming'
      ? `Applications are not open yet; the stated last date to apply is ${formatDate(applicationDeadline)}.`
      : lifecycle?.state === 'results'
        ? 'This recruitment is in the results stage; applications are not open.'
        : lifecycle?.state === 'archived'
          ? 'This recruitment is archived; applications are not open.'
          : lifecycle?.state === 'closed' || isApplicationClosed
            ? (lifecycle?.daysLeft !== null && lifecycle?.daysLeft !== undefined && lifecycle.daysLeft <= 0)
              ? `Applications closed on ${formatDate(applicationDeadline)}.`
              : 'Applications are closed.'
            : `The last date to apply is ${formatDate(applicationDeadline)}.`;
  const publishedDate = post.notificationPublicationDate || post.postedAt ? new Date(post.notificationPublicationDate || post.postedAt!) : null;
  const modifiedDate = post.updatedAt ? new Date(post.updatedAt) : null;

  const qualificationText = post.qualificationText || post.fjaExtract?.qualificationRaw || null;
  const experienceText = post.experienceText || post.fjaExtract?.experienceRaw || null;
  const ageText = post.ageLimit || post.fjaExtract?.ageRaw || null;
  const employmentLabel = post.employmentType ? EMPLOYMENT_LABELS[post.employmentType.toUpperCase()] ?? null : null;
  const salaryText = salaryMin
    ? (salaryMax && salaryMax !== salaryMin ? `${inr(salaryMin)} – ${inr(salaryMax)} per month` : `${inr(salaryMin)} per month`)
    : post.fjaExtract?.salaryRaw ?? null;
  const orgName = post.organizationName ?? null;
  const advertisementNumber = post.fjaExtract?.advertisementNumber ?? null;

  const feeRows = (post.applicationFees ?? []).map((f) => ({
    who: f.waivedFor ? `Waived for ${f.waivedFor}` : f.note ?? 'All candidates',
    amount: f.amount != null ? inr(f.amount) : 'Nil',
    payment: f.paymentMethods ?? null,
  }));
  const feeText = feeRows.length > 0
    ? feeRows.map((r) => `${r.who}: ${r.amount}`).join('; ')
    : post.applicationFee ?? null;

  const selectionText = post.selectionProcess
    ?? (post.selectionProcessStages && post.selectionProcessStages.length > 0
      ? post.selectionProcessStages.map((s) => s.name).join(' → ')
      : null);

  // ── Official links (deduped by URL) ──────────────────────────────────────
  const links: Array<{ label: string; href: string }> = [];
  const seen = new Set<string>();
  const pushLink = (label: string, href: string | null | undefined) => {
    if (!href || seen.has(href)) return;
    seen.add(href);
    links.push({ label, href });
  };
  if (!isApplicationClosed) pushLink('Apply online', post.applyUrl);
  pushLink('Official notification', post.officialSourceUrl);
  for (const l of post.officialLinks ?? []) pushLink(linkLabel(l), l.url);
  if (isApplicationClosed) pushLink(lifecycle?.state === 'upcoming' ? 'Application portal (not open yet)' : 'Application portal (closed)', post.applyUrl);

  // ── Intro (stored description or one sentence of known facts) ────────────
  const introFacts: string[] = [];
  if (orgName) introFacts.push(`${orgName} has invited applications for the post of ${post.title}${post.recruitmentName ? ` under ${post.recruitmentName}` : ''}`);
  else introFacts.push(`Applications are invited for the post of ${post.title}${post.recruitmentName ? ` under ${post.recruitmentName}` : ''}`);
  const introDetail: string[] = [];
  if (vacancies > 0) introDetail.push(`${vacancies.toLocaleString('en-IN')} ${vacancies === 1 ? 'vacancy' : 'vacancies'}`);
  if (qualificationText && qualificationText.length <= 80) introDetail.push(`qualification: ${qualificationText}`);
  if (deadlineStatusText) introDetail.push(deadlineStatusText);
  const intro = post.description
    ?? `${introFacts[0]}${introDetail.length > 0 ? ` — ${introDetail.join(', ')}` : ''}.`;

  // ── Short Details rows ───────────────────────────────────────────────────
  const details: Array<{ label: string; value: React.ReactNode; text: string }> = [];
  if (orgName) details.push({ label: 'Recruiting body', value: orgName, text: orgName });
  if (post.recruitmentName) details.push({ label: 'Recruitment', value: <Link href={`/jobs/${post.recruitmentSlug}`}>{post.recruitmentName}</Link>, text: post.recruitmentName });
  if (advertisementNumber) details.push({ label: 'Advertisement no.', value: advertisementNumber, text: advertisementNumber });
  details.push({ label: 'Post name', value: post.title, text: post.title });
  if (vacancies > 0) details.push({ label: 'Vacancies', value: vacancies.toLocaleString('en-IN'), text: String(vacancies) });
  if (qualificationText) details.push({ label: 'Qualification', value: qualificationText, text: qualificationText });
  if (ageText) details.push({ label: 'Age limit', value: ageText, text: ageText });
  if (salaryText) details.push({ label: 'Pay', value: salaryText, text: salaryText });
  if (feeText) details.push({ label: 'Application fee', value: feeText, text: feeText });
  if (selectionText) details.push({ label: 'Selection', value: selectionText, text: selectionText });
  if (employmentLabel) details.push({ label: 'Job type', value: employmentLabel, text: employmentLabel });
  if (post.locationState || post.locationCity) {
    const loc = [post.locationCity, post.locationState].filter(Boolean).join(', ');
    details.push({ label: 'Job location', value: loc, text: loc });
  }
  if (applicationDeadline) details.push({ label: 'Last date', value: <time dateTime={applicationDeadline.toISOString()}>{formatDate(applicationDeadline)}</time>, text: formatDate(applicationDeadline) });

  // Fact lines for the JobPosting description (same facts, plain text).
  const facts: LeafFact[] = details
    .filter((d) => d.label !== 'Post name')
    .map((d) => ({ label: d.label, text: d.text }));
  if (experienceText) facts.push({ label: 'Experience', text: experienceText });
  if (post.howToApply) facts.push({ label: 'How to apply', text: post.howToApply });

  // ── FAQ (from stored facts only; mirrored 1:1 into FAQPage) ──────────────
  const subject = orgName ? `${orgName} ${post.title}` : post.title;
  const faqItems: LeafFaq[] = faqs && faqs.length > 0
    ? faqs.map((f) => ({ q: f.question, a: f.answer }))
    : [];
  if (faqItems.length === 0) {
    if (applicationDeadline) faqItems.push({
      q: `What is the last date to apply for ${subject}?`,
      a: deadlineStatusText ?? 'The application deadline is not stated.',
    });
    if (vacancies > 0) faqItems.push({ q: `How many vacancies are there for ${subject}?`, a: `There are ${vacancies.toLocaleString('en-IN')} vacancies for ${post.title}.` });
    if (qualificationText) faqItems.push({ q: `What is the qualification required for ${subject}?`, a: qualificationText });
    if (ageText) faqItems.push({ q: `What is the age limit for ${subject}?`, a: ageText });
    if (salaryText) faqItems.push({ q: `What is the salary of ${subject}?`, a: `The pay for ${post.title} is ${salaryText}.` });
    if (feeText) faqItems.push({ q: `What is the application fee for ${subject}?`, a: `${feeText}.` });
    if (selectionText) faqItems.push({ q: `What is the selection process for ${subject}?`, a: `${selectionText}.` });
    if (post.howToApply) faqItems.push({ q: `How to apply for ${subject}?`, a: post.howToApply });
  }

  // ── Schema input ─────────────────────────────────────────────────────────
  const schemaData = {
    post: {
      id: post.id,
      title: post.title,
      slug: post.slug,
      organizationName: post.organizationName,
      organizationWebsite: post.organizationWebsite,
      recruitmentSlug: post.recruitmentSlug,
      recruitmentName: post.recruitmentName,
      employmentType: post.employmentType,
      locationCity: post.locationCity,
      locationState: post.locationState,
      notificationPublicationDate: publishedDate,
      postedAt: post.postedAt ? new Date(post.postedAt) : null,
      updatedAt: modifiedDate,
      vacancyNumber: advertisementNumber,
      officialSourceUrl: post.officialSourceUrl,
      qualificationText,
      experienceText,
    },
    pageTitle: pageTitle ?? post.title,
    pageDescription: pageDescription ?? intro,
    intro,
    facts,
    faqs: faqItems,
    resolvedVacancy: vacancies > 0 ? vacancies : null,
    // Stored salary bounds are monthly pay (7th CPC levels); the resolver
    // emits the same period. Never "yearly".
    resolvedSalary: salaryMin ? { min: salaryMin, max: salaryMax ?? salaryMin, currency: 'INR', period: 'MONTH' } : null,
    resolvedDeadline: applicationDeadline
      ? { date: applicationDeadline, state: isApplicationClosed ? ('CLOSED' as const) : ('OPEN' as const) }
      : { date: null, state: 'UNKNOWN' as const },
  };

  const statusText = lifecycle?.state === 'upcoming'
    ? (applicationDeadline ? `Applications not open yet · last date ${formatDate(applicationDeadline)}` : 'Applications not open yet')
    : lifecycle?.state === 'results'
      ? 'Recruitment is in the results stage'
      : lifecycle?.state === 'archived'
        ? 'This recruitment is archived'
        : lifecycle?.state === 'closed'
          ? (applicationDeadline && applicationDeadline.getTime() <= Date.now() ? `Applications closed on ${formatDate(applicationDeadline)}` : 'Applications are closed')
          : applicationDeadline
            ? `Applications close on ${formatDate(applicationDeadline)}`
            : recruitmentClosed ? 'This recruitment is closed' : null;

  const hasRelated = Boolean(
    (relatedByOrg && relatedByOrg.length > 0) || (relatedByLocation && relatedByLocation.length > 0)
    || (relatedByRole && relatedByRole.length > 0) || (relatedJobs && relatedJobs.length > 0),
  );

  return (
    <>
      {locale !== 'hi' && <JobPostingSchema {...schemaData} emitJobPosting={emitJobPosting && indexable} />}

      <div className={styles.page}>
        <div className={styles.wrap}>
          <nav aria-label="Breadcrumb" className={styles.crumbs}>
            <ol className={styles.crumbsList}>
              <li><Link href="/jobs">Jobs</Link></li>
              {post.recruitmentName && <li><Link href={`/jobs/${post.recruitmentSlug}`}>{post.recruitmentName}</Link></li>}
              <li><span aria-current="page">{post.title}</span></li>
            </ol>
          </nav>

          <article className={styles.article}>
            {/* ── Header ── */}
            <header className={`${styles.card} ${styles.hero}`}>
              <ul className={styles.chips}>
                {statusText && (
                  <li className={`${styles.chip} ${isApplicationClosed ? styles.chipClosed : styles.chipOpen}`}>{statusText}</li>
                )}
                {post.officialSourceUrl && <li className={styles.chip}>From official notification</li>}
                {modifiedDate && <li className={`${styles.chip} ${styles.chipMuted}`}>Updated {formatDate(modifiedDate)}</li>}
              </ul>
              <h1 className={styles.heroTitle}>
                {post.title}{orgName ? ` – ${orgName}` : ''}{post.recruitmentName ? ` ${post.recruitmentName}` : ''}
              </h1>
              <p className={styles.lead}>{intro}</p>
              <p className={styles.actions}>
                {post.applyUrl && !isApplicationClosed && (
                  <a className={`${styles.btn} ${styles.btnPrimary}`} href={post.applyUrl} target="_blank" rel="noopener noreferrer">Apply online</a>
                )}
                {post.officialSourceUrl && (
                  <a className={`${styles.btn} ${post.applyUrl && !isApplicationClosed ? styles.btnSecondary : styles.btnPrimary}`} href={post.officialSourceUrl} target="_blank" rel="noopener noreferrer">Official notification</a>
                )}
              </p>
              {publishedDate && (
                <p className={styles.notice}>
                  Published <time dateTime={publishedDate.toISOString()}>{formatDate(publishedDate)}</time>
                  {post.officialSourceUrl ? '. Facts on this page are read from the official notification; confirm on the official site before applying.' : '.'}
                </p>
              )}
            </header>

            {/* ── Short Details ── */}
            <Section id="details" title={`${post.title} – Short Details`}>
              <dl className={styles.glance}>
                {details.map((d) => (
                  <div key={d.label} className={styles.glanceRow}>
                    <dt>{d.label}</dt>
                    <dd>{d.value}</dd>
                  </div>
                ))}
              </dl>
            </Section>

            {/* ── Vacancy breakdown ── */}
            {post.vacanciesByCategory && post.vacanciesByCategory.length > 0 && (
              <Section id="vacancies" title="Vacancy details">
                <div className={styles.scroll}>
                  <table className={styles.table}>
                    <thead><tr><th scope="col">Category</th><th scope="col">Vacancies</th></tr></thead>
                    <tbody>
                      {post.vacanciesByCategory.map((v, i) => (
                        <tr key={i}><th scope="row">{v.category}{v.location ? ` (${v.location})` : ''}</th><td>{v.total}</td></tr>
                      ))}
                      {vacancies > 0 && <tr><th scope="row">Total</th><td><strong>{vacancies.toLocaleString('en-IN')}</strong></td></tr>}
                    </tbody>
                  </table>
                </div>
              </Section>
            )}

            {/* ── Eligibility ── */}
            {(qualificationText || (post.educationRequirements && post.educationRequirements.length > 0) || experienceText || (post.experienceRequirements && post.experienceRequirements.length > 0)) && (
              <Section id="eligibility" title="Eligibility criteria">
                {qualificationText && (
                  <>
                    <h3 className={styles.subTitle}>Educational qualification</h3>
                    <p className={styles.preLine}>{qualificationText}</p>
                  </>
                )}
                {post.educationRequirements && post.educationRequirements.length > 0 && (
                  <ul className={styles.list}>
                    {post.educationRequirements.map((e, i) => {
                      const options = safeJsonParse<string[]>(e.degree, [e.degree || ''].filter(Boolean));
                      const degree = Array.isArray(options) ? options.join(' or ') : e.degree;
                      const extras = [e.subject && `in ${e.subject}`, e.specialization && `(${e.specialization})`, e.minimumPercentage && `with minimum ${e.minimumPercentage}%`].filter(Boolean).join(' ');
                      return <li key={i}>{degree}{extras ? ` ${extras}` : ''}</li>;
                    })}
                  </ul>
                )}
                {(experienceText || (post.experienceRequirements && post.experienceRequirements.length > 0)) && (
                  <>
                    <h3 className={styles.subTitle}>Experience</h3>
                    {experienceText && <p className={styles.preLine}>{experienceText}</p>}
                    {post.experienceRequirements && post.experienceRequirements.length > 0 && (
                      <ul className={styles.list}>
                        {post.experienceRequirements.map((x, i) => (
                          <li key={i}>{x.type}{x.minYears || x.totalYears ? `: ${x.minYears || x.totalYears} years` : ''}</li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </Section>
            )}

            {/* ── Age limit ── */}
            {(ageText || (post.ageRules && post.ageRules.length > 0)) && (
              <Section id="age" title="Age limit">
                {ageText && <p className={styles.preLine}>{ageText}</p>}
                {post.ageRules && post.ageRules.length > 0 && (
                  <div className={styles.scroll}>
                    <table className={styles.table}>
                      <thead><tr><th scope="col">Category</th><th scope="col">Maximum age</th><th scope="col">Relaxation</th></tr></thead>
                      <tbody>
                        {post.ageRules.map((r, i) => (
                          <tr key={i}>
                            <th scope="row">{r.category}</th>
                            <td>{r.maxAge ? `${r.maxAge} years` : r.ruleType === 'NO_UPPER_LIMIT' ? 'No upper limit' : '—'}</td>
                            <td>{r.relaxationYears ? `${r.relaxationYears} years` : '—'}{r.note ? ` (${r.note})` : ''}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Section>
            )}

            {/* ── Fee ── */}
            {(feeRows.length > 0 || post.applicationFee) && (
              <Section id="fee" title="Application fee">
                {feeRows.length > 0 ? (
                  <div className={styles.scroll}>
                    <table className={styles.table}>
                      <thead><tr><th scope="col">Category</th><th scope="col">Fee</th>{feeRows.some((r) => r.payment) && <th scope="col">Payment</th>}</tr></thead>
                      <tbody>
                        {feeRows.map((r, i) => (
                          <tr key={i}><th scope="row">{r.who}</th><td>{r.amount}</td>{feeRows.some((x) => x.payment) && <td>{r.payment ?? '—'}</td>}</tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <p className={styles.preLine}>{post.applicationFee}</p>}
              </Section>
            )}

            {/* ── Salary ── */}
            {salaryText && (
              <Section id="salary" title={`${post.title} salary`}>
                <p>{salaryMin ? `The pay for ${post.title} is ${salaryText}` : salaryText}{salaryMin ? ' (basic pay as stated in the notification; allowances are paid in addition).' : ''}</p>
              </Section>
            )}

            {/* ── Selection ── */}
            {(post.selectionProcess || (post.selectionProcessStages && post.selectionProcessStages.length > 0)) && (
              <Section id="selection" title="Selection process">
                {post.selectionProcess && <p className={styles.preLine}>{post.selectionProcess}</p>}
                {post.selectionProcessStages && post.selectionProcessStages.length > 0 && (
                  <ol className={styles.numbered}>
                    {post.selectionProcessStages.map((s, i) => (
                      <li key={i}>
                        <strong>{s.name}</strong>
                        {[s.totalMarks && `${s.totalMarks} marks`, s.minimumMarks && `qualifying ${s.minimumMarks}`, s.durationMinutes && `${s.durationMinutes} minutes`, s.scheduledDate && formatDate(s.scheduledDate)].filter(Boolean).length > 0
                          && ` — ${[s.totalMarks && `${s.totalMarks} marks`, s.minimumMarks && `qualifying ${s.minimumMarks}`, s.durationMinutes && `${s.durationMinutes} minutes`, s.scheduledDate && formatDate(s.scheduledDate)].filter(Boolean).join(', ')}`}
                      </li>
                    ))}
                  </ol>
                )}
              </Section>
            )}

            {/* ── Important dates ── */}
            {post.importantDates && post.importantDates.length > 0 && (
              <Section id="dates" title="Important dates">
                <div className={styles.scroll}>
                  <table className={styles.table}>
                    <thead><tr><th scope="col">Event</th><th scope="col">Date</th></tr></thead>
                    <tbody>
                      {post.importantDates.map((d, i) => {
                        const dt = toPlausibleRecruitmentDate(d.date);
                        return (
                          <tr key={i}>
                            <th scope="row">{d.type}</th>
                            <td>{dt ? <time dateTime={dt.toISOString()}>{formatDate(dt)}</time> : d.date}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Section>
            )}

            {/* ── Documents ── */}
            {post.requiredDocuments && post.requiredDocuments.length > 0 && (
              <Section id="documents" title="Documents required">
                <ul className={styles.list}>
                  {post.requiredDocuments.map((d, i) => (
                    <li key={i}>{d.name}{d.category ? ` (${d.category})` : ''}{d.isRequired ? '' : ' — if applicable'}</li>
                  ))}
                </ul>
              </Section>
            )}

            {/* ── How to apply ── */}
            {post.howToApply && (
              <Section id="apply" title={`How to apply for ${post.title}`}>
                <p className={styles.preLine}>{post.howToApply}</p>
              </Section>
            )}

            {/* ── Important links ── */}
            {links.length > 0 && (
              <Section id="links" title="Important links">
                <div className={styles.scroll}>
                  <table className={styles.table}>
                    <thead><tr><th scope="col">Link</th><th scope="col">URL</th></tr></thead>
                    <tbody>
                      {links.map((l) => (
                        <tr key={l.href}>
                          <th scope="row">{l.label}</th>
                          <td className={styles.urlCell}><a href={l.href} target="_blank" rel="noopener noreferrer">{l.href}</a></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>
            )}

            {/* ── FAQ ── */}
            {faqItems.length > 0 && (
              <Section id="faq" title={`${post.title} – FAQs`}>
                {faqItems.map(({ q, a }) => (
                  <details key={q} className={styles.details}>
                    <summary className={styles.summary}>{q}</summary>
                    <div className={styles.dbody}><p className={styles.preLine}>{a}</p></div>
                  </details>
                ))}
              </Section>
            )}

            {/* ── Related ── */}
            {hasRelated && (
              <Section id="related" title="Related jobs">
                {relatedByOrg && relatedByOrg.length > 0 && (
                  <>
                    <h3 className={styles.subTitle}>Other jobs at {orgName}</h3>
                    <ul className={styles.list}>{relatedByOrg.map((r) => <li key={r.slug}><Link href={`/jobs/${r.recruitment_slug}/${r.slug}`}>{r.title}</Link></li>)}</ul>
                  </>
                )}
                {relatedByLocation && relatedByLocation.length > 0 && (
                  <>
                    <h3 className={styles.subTitle}>Other jobs in {post.locationState}</h3>
                    <ul className={styles.list}>{relatedByLocation.map((r) => <li key={r.slug}><Link href={`/jobs/${r.recruitment_slug}/${r.slug}`}>{r.title}</Link></li>)}</ul>
                  </>
                )}
                {relatedByRole && relatedByRole.length > 0 && (
                  <>
                    <h3 className={styles.subTitle}>Similar posts</h3>
                    <ul className={styles.list}>{relatedByRole.map((r) => <li key={r.slug}><Link href={`/jobs/${r.recruitment_slug}/${r.slug}`}>{r.title}</Link></li>)}</ul>
                  </>
                )}
                {relatedJobs && relatedJobs.length > 0 && (
                  <ul className={styles.list}>
                    {relatedJobs.map((j) => (
                      <li key={j.id}>
                        <Link href={`/jobs/${j.recruitmentSlug}/${j.slug}`}>{j.title}</Link>
                        {j.applicationDeadline && <span className={styles.muted}> — apply by {formatDate(new Date(j.applicationDeadline))}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
            )}

            {/* ── Explore ── */}
            <nav aria-label="Explore more" className={styles.explore}>
              <span className={styles.exploreLabel}>Explore</span>
              {post.recruitmentName && <Link href={`/jobs/${post.recruitmentSlug}`} className={styles.pill}>{post.recruitmentName}</Link>}
              {pillarSlug && orgName && <Link href={`/exams/${pillarSlug}/`} className={styles.pill}>{orgName} recruitment guide</Link>}
              <Link href="/closing-soon" className={styles.pill}>Jobs closing this week</Link>
            </nav>

            <p className={styles.note}>
              JobOye is not a government website. Information on this page is compiled from the official notification; candidates should verify every detail on the official website before applying.
              {' '}<Link href="/contact">Report an error</Link>.
            </p>
          </article>
        </div>
      </div>
    </>
  );
}
