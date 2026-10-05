import { describe, expect, test } from "vitest";
import { resolveState } from "@/lib/states/resolve-state";
import { STATES, getStateBySlug } from "@/lib/states/states";

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

describe("STATES", () => {
  test("36 unique slugs with Hindi names, lookup works", () => {
    expect(STATES.length).toBe(36);
    expect(new Set(STATES.map((s) => s.slug)).size).toBe(36);
    for (const s of STATES) expect(s.nameHi).toMatch(/[ऀ-ॿ]/);
    expect(getStateBySlug("jammu-kashmir")?.name).toBe("Jammu and Kashmir");
    expect(getStateBySlug("andaman-nicobar")?.name).toBe("Andaman and Nicobar Islands");
    expect(getStateBySlug("nope")).toBeUndefined();
  });
});

describe("rule 1: location evidence", () => {
  const cases: Array<[string, In, string | null, string?]> = [
    ["comma trailing state", { locationRegion: "Mohanpur, Nadia, West Bengal" }, "west-bengal", "location_region"],
    ["leading state with parenthetical", { locationRegion: "Uttarakhand (Directorate office in Dehradun)" }, "uttarakhand"],
    ["delhi exact", { locationRegion: "Delhi" }, "delhi"],
    ["new delhi", { locationRegion: "New Delhi" }, "delhi"],
    ["trailing India stripped", { locationRegion: "Jaipur, Rajasthan, India" }, "rajasthan"],
    ["case-insensitive", { locationRegion: "KERALA" }, "kerala"],
    ["J&K spelling", { locationRegion: "Srinagar, J&K" }, "jammu-kashmir"],
    ["anywhere in India", { locationRegion: "Anywhere in India" }, null],
    ["various across India", { locationRegion: "Various locations across India" }, null],
    ["plain India", { locationRegion: "India" }, null],
    ["two states", { locationRegion: "Rajasthan, Gujarat" }, null],
    ["state plus city of another state", { locationRegion: "Delhi, Mumbai, Chennai" }, null],
    ["state list beats org evidence", { locationRegion: "Bihar and Jharkhand", organizationName: "BPSC" }, null],
    ["city only: Mumbai", { locationRegion: "Mumbai" }, "maharashtra", "location_region"],
    ["city only: Bengaluru", { locationRegion: "Bengaluru" }, "karnataka"],
    ["city list is not a single city", { locationRegion: "Mumbai, Pune" }, null],
    ["unmapped city", { locationRegion: "Aurangabad" }, null],
    ["state buried mid-list", { locationRegion: "Gujarat, Pune, Pune, Pune" }, null],
    ["location wins over org alias", { locationRegion: "Delhi", organizationName: "UPSSSC" }, "delhi"],
    ["location evidence allowed for central org", { locationRegion: "Haryana", organizationName: "SSC" }, "haryana"],
    ["Hindi-only city text is unresolved", { locationRegion: "मुंबई" }, null],
  ];
  test.each(cases)("%s", (_n, input, slug, basis) => {
    const out = r(input);
    expect(out?.slug ?? null).toBe(slug);
    if (basis) expect(out?.basis).toBe(basis);
  });

  test("organization_state used when no posting location", () => {
    expect(r({ organizationName: "Some Board", organizationState: "Odisha" })).toEqual({
      slug: "odisha",
      basis: "organization_state",
    });
  });
  test("organization_state ignored for a central body (HQ state only)", () => {
    expect(r({ organizationName: "Staff Selection Commission", title: "SSC CGL 2026", organizationState: "Delhi" })).toBeNull();
    expect(r({ organizationName: "Indian Space Research Org", organizationState: "Karnataka" })).toBeNull();
    expect(r({ organizationName: "Punjab National Bank", organizationState: "Delhi" })).toBeNull();
  });
  test("organization_state multi-state is null", () => {
    expect(r({ organizationName: "Some Board", organizationState: "Delhi, Haryana" })).toBeNull();
  });
});

describe("rule 2: state-level bodies and names", () => {
  const cases: Array<[string, In, string | null, string?]> = [
    ["UPESSC title", { title: "UPESSC UP PRT Assistant Teacher Recruitment 2026" }, "uttar-pradesh", "title"],
    ["UPSSSC org", { organizationName: "UPSSSC", title: "Junior Assistant" }, "uttar-pradesh", "organization_name"],
    ["UPPSC", { organizationName: "UPPSC" }, "uttar-pradesh"],
    ["UPSRTC", { title: "UPSRTC Conductor" }, "uttar-pradesh"],
    ["GSRTC Helper", { title: "GSRTC Helper Recruitment" }, "gujarat"],
    ["BPSC TRE 4.0 Bihar", { title: "BPSC TRE 4.0 Teacher Recruitment Bihar" }, "bihar"],
    ["BSSC", { organizationName: "BSSC" }, "bihar"],
    ["RPSC", { organizationName: "RPSC" }, "rajasthan"],
    ["RSMSSB", { title: "RSMSSB Patwari" }, "rajasthan"],
    ["MPESB", { title: "MPESB Constable" }, "madhya-pradesh"],
    ["HSSC", { title: "HSSC CET Group D" }, "haryana"],
    ["HPSC", { organizationName: "HPSC" }, "haryana"],
    ["HPPSC not HPSC", { organizationName: "HPPSC" }, "himachal-pradesh"],
    ["PSSSB", { title: "PSSSB Clerk" }, "punjab"],
    ["JKSSB", { title: "JKSSB Naib Tehsildar" }, "jammu-kashmir"],
    ["OSSSC", { title: "OSSSC Forest Guard" }, "odisha"],
    ["TNPSC", { title: "TNPSC Group 4" }, "tamil-nadu"],
    ["TRB Tamil Nadu by name", { title: "TRB Tamil Nadu Assistant Professor" }, "tamil-nadu"],
    ["Kerala PSC", { organizationName: "Kerala PSC" }, "kerala"],
    ["WBPolice", { title: "WBPolice Constable" }, "west-bengal"],
    ["TSPSC / TGPSC", { organizationName: "TGPSC" }, "telangana"],
    ["JSSC", { title: "JSSC Matric Level" }, "jharkhand"],
    ["CGVyapam", { title: "CGVyapam Lab Technician" }, "chhattisgarh"],
    ["UKSSSC", { title: "UKSSSC Patwari" }, "uttarakhand"],
    ["APSC Assam", { organizationName: "APSC" }, "assam"],
    ["DSSSB", { title: "DSSSB TGT" }, "delhi"],
    ["DMRC", { organizationName: "DMRC" }, "delhi"],
    ["Delhi Police title", { title: "Delhi Police Head Constable" }, "delhi"],
    ["state staff selection commission is state-level", { organizationName: "Haryana Staff Selection Commission" }, "haryana"],
    ["org name wins over title", { organizationName: "RPSC", title: "Lecturer" }, "rajasthan", "organization_name"],
    ["conflicting org alias and title name", { organizationName: "RPSC", title: "Clerk in Gujarat" }, "rajasthan"],
    ["conflicting alias and name in one source", { title: "BPSC Teacher in Rajasthan" }, null],
    ["two state names in one title", { title: "Punjab and Haryana High Court Clerk" }, null],
  ];
  test.each(cases)("%s", (_n, input, slug, basis) => {
    const out = r(input);
    expect(out?.slug ?? null).toBe(slug);
    if (basis) expect(out?.basis).toBe(basis);
  });
});

describe("MPSC ambiguity", () => {
  test("Manipur PSC explicit name wins", () => {
    expect(
      r({ title: "Manipur PSC Dental Surgeon Recruitment", organizationName: "Manipur Public Service Commission" }),
    ).toEqual({ slug: "manipur", basis: "organization_name" });
    expect(r({ title: "MPSC Dental Surgeon Manipur" })?.slug).toBe("manipur");
  });
  test("MPSC with Maharashtra context", () => {
    expect(r({ title: "MPSC Rajyaseva 2026 Maharashtra" })?.slug).toBe("maharashtra");
    expect(r({ organizationName: "Maharashtra Public Service Commission (MPSC)" })?.slug).toBe("maharashtra");
  });
  test("bare MPSC defaults to Maharashtra (weak alias)", () => {
    expect(r({ title: "MPSC Assistant Motor Vehicle Inspector" })?.slug).toBe("maharashtra");
  });
});

describe("central bodies and denylist never resolve from names", () => {
  const nulls: Array<[string, In]> = [
    ["Punjab National Bank", { organizationName: "Punjab National Bank", title: "PNB Clerk 2026" }],
    ["Punjab National Bank in title only", { title: "Punjab National Bank LBO Recruitment" }],
    ["UPSC is national", { organizationName: "UPSC", title: "UPSC Civil Services 2026" }],
    ["Union Public Service Commission", { organizationName: "Union Public Service Commission" }],
    ["Assam Rifles", { organizationName: "Assam Rifles", title: "Assam Rifles Rally Technical" }],
    ["Bank of Maharashtra", { organizationName: "Bank of Maharashtra", title: "Generalist Officer" }],
    ["Bank of India", { title: "Bank of India Apprentice" }],
    ["Indian Overseas Bank", { organizationName: "Indian Overseas Bank" }],
    ["Central Bank of India", { organizationName: "Central Bank of India" }],
    ["Andhra Bank", { organizationName: "Andhra Bank" }],
    ["Karnataka Gramin Bank", { organizationName: "Karnataka Gramin Bank" }],
    ["J&K Bank", { organizationName: "Jammu and Kashmir Bank" }],
    ["SSC CGL", { organizationName: "SSC", title: "SSC CGL 2026" }],
    ["SSC with state in title", { title: "SSC Delhi Police Constable 2026" }],
    ["IBPS", { organizationName: "IBPS", title: "IBPS PO Rajasthan" }],
    ["SBI circle", { organizationName: "State Bank of India", title: "SBI Clerk Uttar Pradesh Circle" }],
    ["RRB", { organizationName: "RRB", title: "RRB NTPC Bihar" }],
    ["Railways", { organizationName: "Indian Railways", title: "Railway Group D Gujarat" }],
    ["NTPC", { organizationName: "NTPC", title: "NTPC Odisha Executive" }],
    ["ISRO", { organizationName: "ISRO", title: "ISRO Kerala Scientist" }],
    ["AIIMS with no place or state", { organizationName: "AIIMS", title: "Nursing Officer" }],
    ["BSF", { organizationName: "BSF", title: "BSF Punjab Frontier Constable" }],
    ["Goa Shipyard (central PSU)", { organizationName: "Goa Shipyard Limited" }],
    ["unknown / no evidence", { title: "Junior Engineer Recruitment 2026" }],
    ["empty", {}],
  ];
  test.each(nulls)("%s -> null", (_n, input) => {
    expect(r(input)).toBeNull();
  });

  test("AIIMS Delhi resolves via explicit state name only", () => {
    expect(r({ organizationName: "AIIMS Delhi", title: "Senior Resident" })?.slug).toBe("delhi");
    expect(r({ title: "AIIMS Delhi Nursing Officer" })?.slug).toBe("delhi");
  });
  test("central bodies still resolve through explicit location evidence", () => {
    expect(r({ organizationName: "AIIMS Bhopal", locationRegion: "Madhya Pradesh" })?.slug).toBe("madhya-pradesh");
  });
  test("no false hit when a substring is not a whole word", () => {
    expect(r({ title: "Assamese language translator" })).toBeNull();
    expect(r({ title: "Manipal Hospital Nurse" })).toBeNull();
  });
});
