import { describe, expect, it } from "vitest";
import { buildDescriptiveRecruitmentSlug } from "../../../src/ingest/slug-generator";

describe("buildDescriptiveRecruitmentSlug", () => {
  it("removes the source site apply-online SEO suffix", () => {
    expect(buildDescriptiveRecruitmentSlug("NLC India Apprentice Recruitment 2026 Apply Online for 1067 Posts")).toBe("nlc-india-apprentice-recruitment-2026");
    expect(buildDescriptiveRecruitmentSlug("KSRTC SWIFT Recruitment 2026 Apply Online for 5 Front Office Manager, Housekeeping Staff and More Posts")).toBe("ksrtc-swift-recruitment-2026");
  });
  it("normalizes punctuation and repeated separators", () => {
    expect(buildDescriptiveRecruitmentSlug("State Board — Junior Engineer (2026)")).toBe("state-board-junior-engineer-2026");
  });
  it("rejects a title that cannot produce a safe slug", () => {
    expect(() => buildDescriptiveRecruitmentSlug("!!!")).toThrow(/Unable to build/);
  });
});
