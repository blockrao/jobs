/**
 * ISO 3166-2:IN code → state hub slug and display name.
 *
 * Mirrors the code map in src/lib/states/queries.ts (which is DB-bound and
 * cannot be imported into pure rendering code) and joins it with the state
 * taxonomy in src/lib/states/states.ts so a page can show "Odisha" and link
 * /states/odisha from a stored "IN-OR" without ever printing the raw code.
 */
import { getStateBySlug } from "@/lib/states/states";

const CODE_TO_SLUG: Record<string, string> = {
  "IN-AP": "andhra-pradesh",
  "IN-AR": "arunachal-pradesh",
  "IN-AS": "assam",
  "IN-BR": "bihar",
  "IN-CG": "chhattisgarh",
  "IN-CT": "chhattisgarh",
  "IN-GA": "goa",
  "IN-GJ": "gujarat",
  "IN-HR": "haryana",
  "IN-HP": "himachal-pradesh",
  "IN-JK": "jammu-kashmir",
  "IN-JH": "jharkhand",
  "IN-KA": "karnataka",
  "IN-KL": "kerala",
  "IN-MP": "madhya-pradesh",
  "IN-MH": "maharashtra",
  "IN-MN": "manipur",
  "IN-ML": "meghalaya",
  "IN-MZ": "mizoram",
  "IN-NL": "nagaland",
  "IN-OD": "odisha",
  "IN-OR": "odisha",
  "IN-PB": "punjab",
  "IN-RJ": "rajasthan",
  "IN-SK": "sikkim",
  "IN-TN": "tamil-nadu",
  "IN-TS": "telangana",
  "IN-TG": "telangana",
  "IN-TR": "tripura",
  "IN-UP": "uttar-pradesh",
  "IN-UK": "uttarakhand",
  "IN-UT": "uttarakhand",
  "IN-WB": "west-bengal",
  "IN-AN": "andaman-nicobar",
  "IN-CH": "chandigarh",
  "IN-DH": "dadra-nagar-haveli-daman-diu",
  "IN-DN": "dadra-nagar-haveli-daman-diu",
  "IN-DD": "dadra-nagar-haveli-daman-diu",
  "IN-DL": "delhi",
  "IN-LA": "ladakh",
  "IN-LD": "lakshadweep",
  "IN-PY": "puducherry",
};

export interface IndiaStateRef {
  slug: string;
  name: string;
}

/** Resolve an ISO 3166-2:IN code (e.g. "IN-RJ") to its state; null when unknown. */
export function stateFromIsoCode(code: string | null | undefined): IndiaStateRef | null {
  if (!code) return null;
  const slug = CODE_TO_SLUG[code.trim().toUpperCase()];
  if (!slug) return null;
  const st = getStateBySlug(slug);
  return st ? { slug: st.slug, name: st.name } : null;
}
