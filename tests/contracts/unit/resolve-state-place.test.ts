import { describe, expect, test } from "vitest";
import { resolveState } from "@/lib/states/resolve-state";
import { AMBIGUOUS_PLACES, PLACE_TO_STATE } from "@/lib/states/place-state";
import { getStateBySlug } from "@/lib/states/states";
import { buildBackfill } from "@/lib/states/backfill-sql";

type In = Partial<Parameters<typeof resolveState>[0]>;
const r = (i: In) =>
  resolveState({
    title: "",
    organizationName: null,
    locationRegion: null,
    locationCity: null,
    organizationState: null,
    ...i,
  });

describe("PLACE_TO_STATE map", () => {
  test("is large, every target is a known state, ambiguous places are absent", () => {
    expect(Object.keys(PLACE_TO_STATE).length).toBeGreaterThan(500);
    for (const [place, slug] of Object.entries(PLACE_TO_STATE)) {
      expect(getStateBySlug(slug), place).toBeDefined();
      expect(place).toBe(place.trim().toLowerCase());
    }
    for (const a of AMBIGUOUS_PLACES) expect(PLACE_TO_STATE[a], a).toBeUndefined();
    expect(PLACE_TO_STATE["balrampur"]).toBeUndefined();
  });
});

describe("place tier: organization name", () => {
  const cases: Array<[string, string, string]> = [
    ["Indian Institute of Management Lucknow", "uttar-pradesh", "IIM Lucknow Manager Recruitment 2026"],
    ["All India Institute of Medical Sciences Bhopal", "madhya-pradesh", "AIIMS Bhopal Project Associate"],
    ["Indian Institute of Technology Roorkee", "uttarakhand", "IIT Roorkee JRF"],
    ["Mumbai Port Authority", "maharashtra", "Mumbai Port Authority Deputy Chief Engineer"],
    ["Cochin Port Authority", "kerala", "Cochin Port Authority Dredger Commander"],
    ["Gadag District Court", "karnataka", "Gadag District Court Peon"],
    ["District Child Protection Unit Ariyalur", "tamil-nadu", "DCPU Ariyalur Recruitment"],
    ["District Panchayat Raipur", "chhattisgarh", "District Panchayat Raipur Accountant"],
    ["Deputy Commissioner Tuensang", "nagaland", "Deputy Commissioner Tuensang MTS"],
    ["Family Court Muzaffarnagar", "uttar-pradesh", "Family Court Muzaffarnagar Consultant"],
    ["Madras University", "tamil-nadu", "Madras University Guest Lecturer"],
    ["Indian Institute of Technology Kharagpur", "west-bengal", "IIT Kharagpur Research Associate"],
    ["Indian Institute of Technology Jammu", "jammu-kashmir", "IIT Jammu JRF"],
    ["Indian Institute of Technology Gandhinagar", "gujarat", "IIT Gandhinagar Project Engineer"],
    ["Indian Institute of Management Kozhikode", "kerala", "IIM Kozhikode Support Engineer"],
    ["AIIMS Mangalagiri", "andhra-pradesh", "AIIMS Mangalagiri Senior Resident"],
    ["All India Institute of Medical Sciences Bibinagar", "telangana", "AIIMS Bibinagar Consultant"],
    ["All India Institute of Medical Sciences Deoghar", "jharkhand", "AIIMS Deoghar Research Associate"],
    ["All India Institute of Medical Sciences Rishikesh", "uttarakhand", "AIIMS Rishikesh Recruitment"],
    ["All India Institute of Medical Sciences Jodhpur", "rajasthan", "AIIMS Jodhpur Senior Resident"],
    ["All India Institute of Medical Sciences Rewari", "haryana", "AIIMS Rewari JR"],
    ["All India Institute of Medical Sciences Bathinda", "punjab", "AIIMS Bathinda Perfusionist"],
    ["Indian Institute of Technology Indore", "madhya-pradesh", "IIT Indore SRF"],
    ["Indian Institute of Management Mumbai", "maharashtra", "IIM Mumbai Manager"],
    ["Indian Institute of Management Ahmedabad", "gujarat", "IIMA Research Assistant"],
    ["Indian Institute of Technology Hyderabad", "telangana", "IIT Hyderabad Project Associate"],
    ["Birla Institute of Technology & Science Pilani", "rajasthan", "BITS Pilani JRF"],
    ["Cantonment Board Barrackpore", "west-bengal", "Cantonment Board Barrackpore Physiotherapist"],
    ["ABV Indian Institute of Information Technology and Management Gwalior", "madhya-pradesh", "ABV IIITM Gwalior"],
    ["Child Development Project Office Poshan Beerwah", "jammu-kashmir", "CDPO Poshan Beerwah Anganwadi"],
    ["District Legal Services Authority Mulugu", "telangana", "DLSA Mulugu Recruitment"],
    ["Ex-Servicemen Contributory Health Scheme Karwar", "karnataka", "ECHS Karwar Medical Officer"],
    ["Ananthapuramu District Court", "andhra-pradesh", "Ananthapuramu District Court Computer Assistant"],
    ["Bastar District", "chhattisgarh", "Bastar District Masseurs"],
    ["Amethi District", "uttar-pradesh", "Amethi District Yoga Instructor"],
    ["District Panchayat Bemetara", "chhattisgarh", "District Panchayat Bemetara DEO"],
    ["District Panchayat Gariaband", "chhattisgarh", "District Panchayat Gariaband Program Officer"],
    ["District Basic Education Officer Prayagraj", "uttar-pradesh", "DBEO Prayagraj PGT"],
    ["Employees State Insurance Corporation Medical College & Hospital Alwar", "rajasthan", "ESIC Alwar Walkin"],
    ["Indian Institute of Science Education and Research Pune", "maharashtra", "IISER Pune Research Associate"],
    ["Shillong Polytechnic", "meghalaya", "Polytechnic Lecturer"],
  ];
  test.each(cases)("%s -> %s", (org, slug, title) => {
    expect(r({ organizationName: org, title })).toEqual({ slug, basis: "place" });
  });

  test("Kochi and Cochin spellings both map to kerala", () => {
    expect(r({ organizationName: "Kochi Metro Training Centre" })?.slug).toBe("kerala");
    expect(r({ organizationName: "Cochin University of Science and Technology" })?.slug).toBe("kerala");
  });
  test("Hyderabad and Mumbai resolve", () => {
    expect(r({ organizationName: "Hyderabad Metro Water Board" })?.slug).toBe("telangana");
    expect(r({ organizationName: "Mumbai Port Authority" })?.slug).toBe("maharashtra");
  });
});

describe("place tier: Central University named for a state", () => {
  test.each([
    ["Central University of Haryana", "haryana"],
    ["Central University of Rajasthan", "rajasthan"],
    ["Central University of Tamil Nadu", "tamil-nadu"],
  ])("%s", (org, slug) => {
    expect(r({ organizationName: org, title: "CU Recruitment 2026" })).toEqual({ slug, basis: "place" });
  });
  test("a central university with no state stays unresolved", () => {
    expect(r({ organizationName: "Central University", title: "Professor" })).toBeNull();
  });
});

describe("place tier: title", () => {
  test("title place used when org gives nothing and title is a single workplace", () => {
    expect(r({ organizationName: "Educational Institution", title: "NIT Calicut Research Assistant" })).toEqual({
      slug: "kerala",
      basis: "place",
    });
    expect(r({ organizationName: "Educational Institution", title: "NIT Agartala Non-Teaching Recruitment" })?.slug).toBe(
      "tripura",
    );
    expect(r({ organizationName: "All India Institute of Medical Sciences", title: "AIIMS Madurai Research Associate" })?.slug).toBe(
      "tamil-nadu",
    );
  });
  test("two places in the title -> unresolved", () => {
    expect(r({ organizationName: "Some Trust", title: "Clerks for Pune and Nagpur offices" })).toBeNull();
  });
  test("across India notice -> unresolved even with one place", () => {
    expect(r({ organizationName: "Some Trust", title: "Staff across India, HQ Kolkata" })).toBeNull();
  });
  test("title place is skipped for national recruiters", () => {
    expect(r({ organizationName: "Staff Selection Commission", title: "SSC Lucknow Region Recruitment" })).toBeNull();
    expect(r({ organizationName: "State Bank of India", title: "SBI Clerk Lucknow Circle" })).toBeNull();
  });
  test("title place is skipped for centralish non-institutions", () => {
    expect(r({ organizationName: "National Insurance Company Limited", title: "Assistant Kolkata" })).toBeNull();
  });
  test("title with a state name never gets place evidence", () => {
    expect(r({ organizationName: "Some Trust", title: "Lucknow office, Punjab and Haryana" })).toBeNull();
  });
});

describe("place tier: exclusions", () => {
  test.each([
    ["Chief Medical and Health Office Balrampur", "Balrampur is UP and Chhattisgarh"],
    ["National Institute of Technology Hamirpur", "Hamirpur is HP and UP"],
    ["Physical Research Laboratory Udaipur Solar Observatory", "Udaipur is Rajasthan and Tripura"],
    ["Aurangabad Municipal Corporation", "Aurangabad is Maharashtra and Bihar"],
    ["Bilaspur Municipal Corporation", "Bilaspur is CG and HP"],
    ["Srinagar Municipal Corporation", "Srinagar is J&K and Uttarakhand"],
  ])("%s stays unresolved (%s)", (org) => {
    expect(r({ organizationName: org, title: "Recruitment 2026" })).toBeNull();
  });

  test("Tata Institute of Social Sciences is multi-campus", () => {
    expect(r({ organizationName: "Tata Institute of Social Sciences", title: "TISS Research Associate" })).toBeNull();
  });
  test("TISS resolves only if the title names one campus place", () => {
    expect(r({ organizationName: "Tata Institute of Social Sciences", title: "TISS Guwahati Project Officer" })).toEqual({
      slug: "assam",
      basis: "place",
    });
  });

  test.each([
    "Staff Selection Commission",
    "Union Public Service Commission",
    "Institute of Banking Personnel Selection",
    "State Bank of India",
    "National Informatics Centre (NIC)",
    "Indian Council of Medical Research",
    "Cabinet Secretariat",
    "Indian Armed Forces",
    "Government eMarketplace",
    "Indo-Tibetan Border Police Force (ITBP)",
    "Railway Recruitment Board",
    "Central Railway",
    "East Central Railway",
    "Konkan Railway Corporation",
    "Bank of Baroda",
    "Indian Overseas Bank IOB Apprentice",
    "Office of the Directorate General Assam Rifles, Shillong – 793010",
  ])("national body %s stays unresolved", (org) => {
    expect(r({ organizationName: org, title: "Recruitment 2026" })).toBeNull();
  });

  test("national body with a mapped place in its name stays unresolved", () => {
    expect(r({ organizationName: "Railway Recruitment Board Mumbai", title: "RRB Mumbai Group D" })).toBeNull();
    expect(r({ organizationName: "Allahabad Bank", title: "Clerk" })).toBeNull();
    expect(r({ organizationName: "Punjab National Bank Lucknow Circle", title: "PNB LBO" })).toBeNull();
  });

  test("brand/substring tokens do not match (Manipal vs Manipur, Assamese)", () => {
    expect(r({ organizationName: "Manipal Hospitals", title: "Staff Nurse" })).toBeNull();
    expect(r({ organizationName: "Lucknowi Foods", title: "Recruitment" })).toBeNull();
  });
});

describe("place tier: priorities and contradictions", () => {
  test("explicit location still wins over place", () => {
    expect(r({ organizationName: "Indian Institute of Management Lucknow", locationRegion: "Haryana" })).toEqual({
      slug: "haryana",
      basis: "location_region",
    });
  });
  test("explicit state name in org wins when place agrees", () => {
    expect(r({ organizationName: "Lucknow University Uttar Pradesh", title: "Prof" })).toEqual({
      slug: "uttar-pradesh",
      basis: "organization_name",
    });
  });
  test("place contradicting an org state name -> null", () => {
    expect(r({ organizationName: "Uttar Pradesh Lucknow Mumbai Cell", title: "x" })).toBeNull();
    expect(r({ organizationName: "Kerala Institute Chennai", title: "x" })).toBeNull();
  });
  test("place contradicting organization_state -> null", () => {
    expect(r({ organizationName: "Madras University", organizationState: "Kerala", title: "x" })).toBeNull();
  });
  test("two places from different states in the org name -> null", () => {
    expect(r({ organizationName: "Mumbai Chennai Joint Cell", title: "x" })).toBeNull();
  });
  test("strong state-body alias still beats place text in the title", () => {
    expect(r({ organizationName: "Some Board", title: "UPSSSC Recruitment, Lucknow office" })?.basis).toBe("title");
  });
});

describe("SQL generator treats place like organization_name", () => {
  const base = { reviewStatus: "approved", currentLocationRegion: null, organizationState: null };
  test("fills region only when region and city are both blank", () => {
    const out = buildBackfill([
      { ...base, id: 1, title: "IIM Lucknow Manager", organizationName: "Indian Institute of Management Lucknow", locationRegion: null, locationCity: null },
      { ...base, id: 2, title: "IIM Lucknow Analyst", organizationName: "Indian Institute of Management Lucknow", locationRegion: null, locationCity: "Noida" },
    ]);
    expect(out.resolvedCount).toBe(2);
    expect(out.regionFillCount).toBe(1);
    expect(out.csv).toContain("1,IIM Lucknow Manager,uttar-pradesh,place");
    expect(out.sql).toContain("(1, 'uttar-pradesh', 'Uttar Pradesh')");
    expect(out.sql).not.toContain("(2, 'uttar-pradesh', 'Uttar Pradesh')");
  });
});
