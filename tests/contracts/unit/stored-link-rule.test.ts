/**
 * LINK-001 (ledger A-087, owner direction 2026-10-13): a stored official link
 * is shown as stored. No judgement on the domain or on the page behind it.
 * The only links never returned are values that are not web addresses and
 * aggregator or social links (standing rule, src/lib/aggregators.ts).
 */
import { describe, expect, test } from "vitest";
import {
  resolveApplicationUrl,
  resolveOfficialSource,
  resolveRecruitmentApplicationUrl,
  resolveRecruitmentOfficialSource,
} from "@/lib/resolvers/fact-resolvers";
import { readSource, stripComments } from "../helpers/source";

type PostInput = Parameters<typeof resolveOfficialSource>[0];
const post = (fields: Record<string, unknown>) => fields as unknown as PostInput;

const PSU_PDF = "https://hal-india.co.in/backend/wp-content/uploads/career/Detailed%20Advt.pdf";
const PSU_HOME = "https://www.hal-india.co.in";
const GOV_PDF = "https://upsc.gov.in/sites/default/files/Advt-12-2026.pdf";
const VENDOR_PORTAL = "https://g03.tcsion.com/per/g03/pub/726/ASM/WebPortal/1/index.html";

describe("LINK-001 stored-link rule: Recruitment", () => {
  test("LINK-01 a stored notification link is returned whatever its domain", () => {
    for (const url of [PSU_PDF, PSU_HOME, GOV_PDF, "https://www.aai.aero/careers/advt.pdf", "http://117.217.104.235/notice.pdf"]) {
      expect(resolveRecruitmentOfficialSource({ officialNotificationUrl: url, officialLinkSource: null })).toBe(url);
    }
  });

  test("LINK-02 the link's provenance flag is not a condition", () => {
    expect(resolveRecruitmentOfficialSource({ officialNotificationUrl: PSU_PDF, officialLinkSource: "MANUAL_VERIFIED" })).toBe(PSU_PDF);
    expect(resolveRecruitmentOfficialSource({ officialNotificationUrl: PSU_PDF, officialLinkSource: undefined })).toBe(PSU_PDF);
  });

  test("LINK-03 nothing stored gives null", () => {
    expect(resolveRecruitmentOfficialSource({ officialNotificationUrl: null, officialLinkSource: null })).toBeNull();
    expect(resolveRecruitmentOfficialSource({ officialNotificationUrl: "", officialLinkSource: null })).toBeNull();
    expect(resolveRecruitmentApplicationUrl({ officialApplicationUrl: null, applyUrl: null })).toBeNull();
  });

  test("LINK-04 application link: official_application_url first, apply_url second, any domain", () => {
    expect(resolveRecruitmentApplicationUrl({ officialApplicationUrl: VENDOR_PORTAL, applyUrl: PSU_HOME })).toBe(VENDOR_PORTAL);
    expect(resolveRecruitmentApplicationUrl({ officialApplicationUrl: null, applyUrl: PSU_HOME })).toBe(PSU_HOME);
  });

  test("LINK-05 a value that is not a web address is not a link", () => {
    expect(resolveRecruitmentApplicationUrl({ officialApplicationUrl: null, applyUrl: "mailto:someone@mnnit.ac.in" })).toBeNull();
    expect(resolveRecruitmentOfficialSource({ officialNotificationUrl: "see the careers page", officialLinkSource: null })).toBeNull();
    expect(resolveRecruitmentOfficialSource({ officialNotificationUrl: "javascript:alert(1)", officialLinkSource: null })).toBeNull();
  });

  test("LINK-06 aggregator and social links are never returned", () => {
    for (const url of [
      "https://www.freejobalert.com/articles/some-recruitment-3071662",
      "https://www.sarkariresult.com/2026/some-notice/",
      "https://t.me/somechannel",
    ]) {
      expect(resolveRecruitmentOfficialSource({ officialNotificationUrl: url, officialLinkSource: "MANUAL_VERIFIED" })).toBeNull();
      expect(resolveRecruitmentApplicationUrl({ officialApplicationUrl: url, applyUrl: url })).toBeNull();
    }
  });

  test("LINK-07 an unusable first application link falls through to the second", () => {
    expect(
      resolveRecruitmentApplicationUrl({
        officialApplicationUrl: "https://www.freejobalert.com/apply",
        applyUrl: PSU_HOME,
      })
    ).toBe(PSU_HOME);
  });
});

describe("LINK-001 stored-link rule: Post", () => {
  test("LINK-08 the Post's own link wins, then the Recruitment's, any domain", () => {
    expect(resolveOfficialSource(post({ officialSourceUrl: PSU_PDF, recruitmentOfficialNotificationUrl: GOV_PDF }))).toBe(PSU_PDF);
    expect(resolveOfficialSource(post({ officialSourceUrl: null, recruitmentOfficialNotificationUrl: PSU_PDF }))).toBe(PSU_PDF);
    expect(resolveApplicationUrl(post({ applyPortalUrl: VENDOR_PORTAL, recruitmentOfficialApplicationUrl: PSU_HOME }))).toBe(VENDOR_PORTAL);
    expect(resolveApplicationUrl(post({ applyPortalUrl: null, recruitmentOfficialApplicationUrl: PSU_HOME }))).toBe(PSU_HOME);
  });

  test("LINK-09 nothing stored gives null; aggregator links are never returned", () => {
    expect(resolveOfficialSource(post({ officialSourceUrl: null, recruitmentOfficialNotificationUrl: null }))).toBeNull();
    expect(resolveApplicationUrl(post({ applyPortalUrl: null, recruitmentOfficialApplicationUrl: null }))).toBeNull();
    expect(
      resolveOfficialSource(post({ officialSourceUrl: "https://www.freejobalert.com/x", recruitmentOfficialNotificationUrl: null }))
    ).toBeNull();
  });
});

describe("LINK-001 the resolver holds no domain list", () => {
  test("LINK-10 link resolvers do not test for government or institution domains", () => {
    const source = stripComments(readSource("src/lib/resolvers/fact-resolvers.ts"));
    expect(source).not.toMatch(/\.gov\.in|\.nic\.in|\.ac\.in|samarth/);
    expect(source).not.toContain("isAuthoritativeDomain");
    expect(source).toContain("isAggregatorUrl");
  });
});
