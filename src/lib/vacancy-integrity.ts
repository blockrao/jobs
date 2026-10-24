/**
 * Conservative trust gate for recruitment-level vacancy totals used in homepage
 * ranking and summary cards.
 *
 * A number is not "verified" merely because it is numeric. The caller must also
 * require an official verification status. This guard excludes zero/negative,
 * non-integer, unsafe, and extreme totals that should be reviewed against the
 * official notification before being promoted as a headline figure.
 */
export const MAX_TRUSTED_RECRUITMENT_VACANCIES = 100_000;

export function isPlausibleRecruitmentVacancyCount(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value > 0 &&
    value <= MAX_TRUSTED_RECRUITMENT_VACANCIES
  );
}
