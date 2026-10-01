/**
 * Backfill Script: Match existing postings to locations table
 *
 * This script parses locationCity and locationRegion from existing postings
 * and finds corresponding location records, then sets location_id.
 *
 * Matching strategy:
 * 1. Try exact district + city match
 * 2. Try exact district (city-level) match
 * 3. Try exact state match
 * 4. Log unmatched postings for manual review
 */

import { db } from "@/db";
import { locations, postings } from "@/db/schema";
import { and, eq, isNull, sql } from "drizzle-orm";

// State code → State name mapping (abbreviated common names)
const STATE_NAME_MAP: Record<string, string[]> = {
  MH: ["Maharashtra", "Maharastra"],
  DL: ["Delhi", "New Delhi"],
  KA: ["Karnataka"],
  TG: ["Telangana"],
  AP: ["Andhra Pradesh"],
  UP: ["Uttar Pradesh"],
  MP: ["Madhya Pradesh"],
  RJ: ["Rajasthan"],
  GJ: ["Gujarat"],
  WB: ["West Bengal"],
  TN: ["Tamil Nadu"],
  KL: ["Kerala"],
  HR: ["Haryana"],
  PB: ["Punjab"],
  JK: ["Jammu and Kashmir", "J&K"],
  HP: ["Himachal Pradesh"],
  UK: ["Uttarakhand"],
  TR: ["Tripura"],
  MN: ["Manipur"],
  MZ: ["Mizoram"],
  NL: ["Nagaland"],
  SK: ["Sikkim"],
  AR: ["Arunachal Pradesh"],
  AS: ["Assam"],
  OR: ["Odisha", "Orissa"],
  CT: ["Chhattisgarh"],
  JH: ["Jharkhand"],
  LD: ["Ladakh"],
  PY: ["Puducherry", "Pondicherry"],
  CH: ["Chandigarh"],
  DN: ["Dadra and Nagar Haveli", "Dadra & Nagar Haveli"],
  DD: ["Daman and Diu", "Daman & Diu"],
  AN: ["Andaman and Nicobar Islands"],
  LK: ["Lakshadweep"],
  GA: ["Goa"],
  BR: ["Bihar"],
};

// Common district name normalizations
const DISTRICT_NORMALIZATIONS: Record<string, string[]> = {
  "central delhi": ["Central Delhi", "Central"],
  "north delhi": ["North Delhi"],
  "south delhi": ["South Delhi"],
  "east delhi": ["East Delhi"],
  "west delhi": ["West Delhi"],
  "new delhi": ["New Delhi"],
  bangalore: ["Bengaluru", "Bangalore Urban"],
  hyderabad: ["Hyderabad", "Rangareddy"],
  pune: ["Pune", "Pimpri-Chinchwad"],
  mumbai: ["Mumbai", "Mumbai City", "Greater Mumbai"],
  thane: ["Thane"],
  nagpur: ["Nagpur"],
  aurangabad: ["Aurangabad"],
};

interface BackfillStats {
  total: number;
  matched: number;
  unmatched: number;
  errors: number;
}

/**
 * Normalize a string for matching: lowercase, trim, handle common variations
 */
function normalizeForMatching(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[()&]/g, "")
    .trim();
}

/**
 * Extract state code from state name
 */
function getStateCode(stateName: string): string | null {
  const normalized = normalizeForMatching(stateName);
  for (const [code, names] of Object.entries(STATE_NAME_MAP)) {
    if (
      names.some((n) =>
        normalizeForMatching(n).includes(normalized) ||
        normalized.includes(normalizeForMatching(n))
      )
    ) {
      return code;
    }
  }
  return null;
}

/**
 * Try to find a matching location for a posting
 */
async function findMatchingLocation(
  locationCity: string | null,
  locationRegion: string | null
) {
  if (!locationRegion) return null;

  const stateName = locationRegion;
  const stateCode = getStateCode(stateName);

  if (!stateCode) {
    console.warn(
      `  ⚠️  Could not determine state code for region: "${stateName}"`
    );
    return null;
  }

  // If we have both city and region, try exact match at city level
  if (locationCity) {
    const cityNormalized = normalizeForMatching(locationCity);
    const districtNormalized = normalizeForMatching(locationCity); // Often same

    // Try 1: Exact city match (state + district + city)
    const cityMatch = await db
      .select()
      .from(locations)
      .where(
        and(
          eq(locations.stateCode, stateCode),
          eq(
            sql`LOWER(TRIM(${locations.cityName}))`,
            sql`'${cityNormalized}'`
          )
        )
      )
      .limit(1);

    if (cityMatch.length > 0) {
      return cityMatch[0];
    }

    // Try 2: Exact district match (state + district, city NULL)
    const districtMatch = await db
      .select()
      .from(locations)
      .where(
        and(
          eq(locations.stateCode, stateCode),
          eq(
            sql`LOWER(TRIM(${locations.districtName}))`,
            sql`'${districtNormalized}'`
          ),
          isNull(locations.cityName)
        )
      )
      .limit(1);

    if (districtMatch.length > 0) {
      return districtMatch[0];
    }
  }

  // Try 3: State-only match (fallback)
  const stateMatch = await db
    .select()
    .from(locations)
    .where(
      and(eq(locations.stateCode, stateCode), isNull(locations.districtName))
    )
    .limit(1);

  if (stateMatch.length > 0) {
    return stateMatch[0];
  }

  return null;
}

/**
 * Main backfill function
 */
async function backfillLocations() {
  console.log("🔄 Starting location backfill...\n");

  const stats: BackfillStats = {
    total: 0,
    matched: 0,
    unmatched: 0,
    errors: 0,
  };

  try {
    // Fetch all postings without location_id
    const unlocatedPostings = await db
      .select({
        id: postings.id,
        slug: postings.slug,
        locationCity: postings.locationCity,
        locationRegion: postings.locationRegion,
      })
      .from(postings)
      .where(isNull(postings.locationId))
      .limit(10000); // Safety limit

    stats.total = unlocatedPostings.length;
    console.log(`📍 Found ${stats.total} postings without location_id\n`);

    if (stats.total === 0) {
      console.log("✅ All postings already have locations assigned!");
      return;
    }

    // Process in batches
    const BATCH_SIZE = 100;
    for (let i = 0; i < unlocatedPostings.length; i += BATCH_SIZE) {
      const batch = unlocatedPostings.slice(i, i + BATCH_SIZE);
      console.log(
        `\n📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(stats.total / BATCH_SIZE)}`
      );

      for (const posting of batch) {
        try {
          const matchedLocation = await findMatchingLocation(
            posting.locationCity,
            posting.locationRegion
          );

          if (matchedLocation) {
            // Update posting with location_id
            await db
              .update(postings)
              .set({ locationId: matchedLocation.id })
              .where(eq(postings.id, posting.id));

            stats.matched++;
            console.log(
              `  ✓ [${posting.slug}] Matched to "${matchedLocation.hierarchyPath}" (ID: ${matchedLocation.id})`
            );
          } else {
            stats.unmatched++;
            console.log(
              `  ✗ [${posting.slug}] No match: city="${posting.locationCity}" region="${posting.locationRegion}"`
            );
          }
        } catch (error) {
          stats.errors++;
          console.error(
            `  ❌ [${posting.slug}] Error:`,
            error instanceof Error ? error.message : String(error)
          );
        }
      }

      // Progress update
      const processed = i + batch.length;
      const progressPercent = Math.round((processed / stats.total) * 100);
      console.log(
        `     Progress: ${processed}/${stats.total} (${progressPercent}%) | Matched: ${stats.matched} | Unmatched: ${stats.unmatched}`
      );
    }

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("📊 BACKFILL SUMMARY");
    console.log("=".repeat(60));
    console.log(`Total postings processed: ${stats.total}`);
    console.log(
      `✅ Successfully matched:   ${stats.matched} (${Math.round((stats.matched / stats.total) * 100)}%)`
    );
    console.log(
      `⚠️  Unmatched:             ${stats.unmatched} (${Math.round((stats.unmatched / stats.total) * 100)}%)`
    );
    console.log(`❌ Errors:                 ${stats.errors}`);
    console.log("=".repeat(60));

    if (stats.unmatched > 0) {
      console.log(
        "\n⚠️  NOTE: Unmatched postings still have location_region set but no location_id."
      );
      console.log(
        "   These postings will be filtered by region in the legacy way until"
      );
      console.log(
        "   location data is added or manual matching is performed.\n"
      );
    }

    console.log("\n✨ Backfill complete!");
  } catch (error) {
    console.error("❌ Fatal error during backfill:", error);
    process.exit(1);
  }
}

// Run the backfill
backfillLocations().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
