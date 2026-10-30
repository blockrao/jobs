import { describe, expect, it } from "vitest";
import { deriveLifecycle } from "../../src/lib/lifecycle";

describe("exclusive recruitment deadline boundary", () => {
  const cutoff = new Date("2026-09-07T18:30:00.000Z");

  it("remains open immediately before the exclusive cutoff", () => {
    const lifecycle = deriveLifecycle("ACTIVE", cutoff, new Date(cutoff.getTime() - 1));
    expect(lifecycle.state).toBe("open");
    expect(lifecycle.isOpen).toBe(true);
  });

  it("is closed at the exact exclusive cutoff", () => {
    const lifecycle = deriveLifecycle("ACTIVE", cutoff, cutoff);
    expect(lifecycle.state).toBe("closed");
    expect(lifecycle.isOpen).toBe(false);
  });

  it("remains closed after the exclusive cutoff", () => {
    const lifecycle = deriveLifecycle("ACTIVE", cutoff, new Date(cutoff.getTime() + 1));
    expect(lifecycle.state).toBe("closed");
  });
});
