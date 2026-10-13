"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { fjaJobInventory, fjaPostInventory } from "@/db/schema";
import { adminSessionToken } from "@/lib/admin-token";

const COOKIE_NAME = "admin_session";
const PERIODS = new Set(["HOUR", "DAY", "WEEK", "MONTH", "YEAR"]);
const TYPES = new Set(["FIXED", "RANGE", "PAY_SCALE", "STIPEND", "CONSOLIDATED", "CTC", "OTHER"]);

async function requireAdmin() {
  const token = await adminSessionToken();
  const store = await cookies();
  if (!token || store.get(COOKIE_NAME)?.value !== token) redirect("/admin/login");
}
function stringValue(data: FormData, key: string): string | null {
  const value = data.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
function positiveInteger(data: FormData, key: string): number | null {
  const raw = stringValue(data, key);
  if (!raw) return null;
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : null;
}
function ageValue(data: FormData, key: string): number | null {
  const raw = stringValue(data, key);
  if (!raw) return null;
  const value = Number(raw);
  return Number.isInteger(value) && value >= 14 && value <= 100 ? value : null;
}
function moneyValue(data: FormData, key: string): string | null {
  const raw = stringValue(data, key);
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 && value <= 1_000_000_000_000 ? value.toFixed(2) : null;
}

export async function saveFjaCandidate(formData: FormData) {
  await requireAdmin();
  const id = positiveInteger(formData, "postInventoryId");
  if (!id) redirect("/admin/fja-review?error=invalid-id");

  const salaryMin = moneyValue(formData, "salaryMin");
  const salaryMax = moneyValue(formData, "salaryMax");
  if (salaryMin && salaryMax && Number(salaryMin) > Number(salaryMax)) {
    redirect("/admin/fja-review?error=salary-range");
  }
  const minAge = ageValue(formData, "minAge");
  const maxAge = ageValue(formData, "maxAge");
  if (minAge !== null && maxAge !== null && minAge > maxAge) {
    redirect("/admin/fja-review?error=age-range");
  }
  const currency = stringValue(formData, "salaryCurrency");
  const period = stringValue(formData, "salaryPeriod");
  const type = stringValue(formData, "salaryType");
  if (currency && currency !== "INR") redirect("/admin/fja-review?error=currency");
  if (period && !PERIODS.has(period)) redirect("/admin/fja-review?error=period");
  if (type && !TYPES.has(type)) redirect("/admin/fja-review?error=salary-type");
  const referenceDateRaw = stringValue(formData, "ageReferenceDate");
  const referenceDate = referenceDateRaw && /^20\d{2}-\d{2}-\d{2}$/.test(referenceDateRaw) ? referenceDateRaw : null;
  if (referenceDateRaw && !referenceDate) redirect("/admin/fja-review?error=reference-date");

  const db = getDb();
  await db.update(fjaPostInventory).set({
    salaryMinCandidate: salaryMin,
    salaryMaxCandidate: salaryMax,
    salaryCurrencyCandidate: currency,
    salaryPeriodCandidate: period,
    salaryTypeCandidate: type,
    salaryNormalizationStatus: "MANUALLY_REVIEWED",
    minAgeYearsCandidate: minAge,
    maxAgeYearsCandidate: maxAge,
    ageReferenceDateCandidate: referenceDate,
    ageNormalizationStatus: "MANUALLY_REVIEWED",
    updatedAt: new Date(),
  }).where(eq(fjaPostInventory.id, id));
  revalidatePath("/admin/fja-review");
  redirect("/admin/fja-review?saved=1");
}

export async function verifyFjaPostAgainstOfficialSource(formData: FormData) {
  await requireAdmin();
  const id = positiveInteger(formData, "postInventoryId");
  const page = positiveInteger(formData, "officialSourcePage");
  const note = stringValue(formData, "verificationNotes");
  const confirmed = stringValue(formData, "confirmOfficialSource") === "yes";
  if (!id || !page || !note || note.length < 12 || !confirmed) {
    redirect("/admin/fja-review?error=verification-evidence");
  }

  const db = getDb();
  const [row] = await db.select({
    recruitmentInventoryId: fjaPostInventory.recruitmentInventoryId,
    officialNotificationUrl: fjaJobInventory.officialNotificationUrl,
  }).from(fjaPostInventory)
    .innerJoin(fjaJobInventory, eq(fjaPostInventory.recruitmentInventoryId, fjaJobInventory.id))
    .where(eq(fjaPostInventory.id, id)).limit(1);
  const officialUrl = row?.officialNotificationUrl;
  if (!officialUrl) redirect("/admin/fja-review?error=missing-official-url");
  let parsed: URL;
  try { parsed = new URL(officialUrl); } catch { redirect("/admin/fja-review?error=invalid-official-url"); }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") redirect("/admin/fja-review?error=invalid-official-url");
  if (/(^|\.)freejobalert\.com$/i.test(parsed.hostname)) redirect("/admin/fja-review?error=aggregator-url");

  await db.update(fjaPostInventory).set({
    officialVerificationStatus: "VERIFIED",
    officialSourcePage: page,
    verificationNotes: note,
    verifiedAt: new Date(),
    updatedAt: new Date(),
  }).where(and(
    eq(fjaPostInventory.id, id),
    eq(fjaPostInventory.recruitmentInventoryId, row!.recruitmentInventoryId),
  ));
  revalidatePath("/admin/fja-review");
  redirect("/admin/fja-review?verified=1");
}
