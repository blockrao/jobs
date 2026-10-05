/**
 * Indian states and union territories. The slug is the stable key stored in
 * postings.state_slug. Names are the official English forms; nameHi is the
 * Devanagari form. Bihar is included although it was missing from the
 * original brief list (BPSC/BSSC resolve to it).
 */
export type StateType = "state" | "union_territory";

export interface IndianState {
  slug: string;
  name: string;
  nameHi: string;
  type: StateType;
}

const s = (slug: string, name: string, nameHi: string, type: StateType = "state"): IndianState => ({
  slug,
  name,
  nameHi,
  type,
});

export const STATES: IndianState[] = [
  s("andhra-pradesh", "Andhra Pradesh", "आंध्र प्रदेश"),
  s("arunachal-pradesh", "Arunachal Pradesh", "अरुणाचल प्रदेश"),
  s("assam", "Assam", "असम"),
  s("bihar", "Bihar", "बिहार"),
  s("chhattisgarh", "Chhattisgarh", "छत्तीसगढ़"),
  s("goa", "Goa", "गोवा"),
  s("gujarat", "Gujarat", "गुजरात"),
  s("haryana", "Haryana", "हरियाणा"),
  s("himachal-pradesh", "Himachal Pradesh", "हिमाचल प्रदेश"),
  // Constitutionally a union territory since 2019.
  s("jammu-kashmir", "Jammu and Kashmir", "जम्मू और कश्मीर", "union_territory"),
  s("jharkhand", "Jharkhand", "झारखंड"),
  s("karnataka", "Karnataka", "कर्नाटक"),
  s("kerala", "Kerala", "केरल"),
  s("madhya-pradesh", "Madhya Pradesh", "मध्य प्रदेश"),
  s("maharashtra", "Maharashtra", "महाराष्ट्र"),
  s("manipur", "Manipur", "मणिपुर"),
  s("meghalaya", "Meghalaya", "मेघालय"),
  s("mizoram", "Mizoram", "मिज़ोरम"),
  s("nagaland", "Nagaland", "नागालैंड"),
  s("odisha", "Odisha", "ओडिशा"),
  s("punjab", "Punjab", "पंजाब"),
  s("rajasthan", "Rajasthan", "राजस्थान"),
  s("sikkim", "Sikkim", "सिक्किम"),
  s("tamil-nadu", "Tamil Nadu", "तमिलनाडु"),
  s("telangana", "Telangana", "तेलंगाना"),
  s("tripura", "Tripura", "त्रिपुरा"),
  s("uttar-pradesh", "Uttar Pradesh", "उत्तर प्रदेश"),
  s("uttarakhand", "Uttarakhand", "उत्तराखंड"),
  s("west-bengal", "West Bengal", "पश्चिम बंगाल"),
  s("andaman-nicobar", "Andaman and Nicobar Islands", "अंडमान और निकोबार द्वीपसमूह", "union_territory"),
  s("chandigarh", "Chandigarh", "चंडीगढ़", "union_territory"),
  s("dadra-nagar-haveli", "Dadra and Nagar Haveli", "दादरा और नगर हवेली", "union_territory"),
  s("daman-diu", "Daman and Diu", "दमन और दीव", "union_territory"),
  s("delhi", "Delhi", "दिल्ली", "union_territory"),
  s("ladakh", "Ladakh", "लद्दाख", "union_territory"),
  s("lakshadweep", "Lakshadweep", "लक्षद्वीप", "union_territory"),
  s("puducherry", "Puducherry", "पुडुचेरी", "union_territory"),
];

const BY_SLUG = new Map(STATES.map((x) => [x.slug, x]));

export function getStateBySlug(slug: string): IndianState | undefined {
  return BY_SLUG.get(slug);
}
