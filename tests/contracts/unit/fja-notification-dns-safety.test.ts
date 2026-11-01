import { describe, expect, it } from "vitest";
import { isPublicNotificationIPv4 } from "@/ingest/fja/notification-url-check";

describe("notification URL DNS safety", () => {
  it("rejects private, loopback, link-local, reserved and documentation IPv4 ranges", () => {
    for (const address of [
      "0.0.0.0",
      "10.0.0.1",
      "100.64.0.1",
      "127.0.0.1",
      "169.254.1.1",
      "172.16.0.1",
      "192.168.1.1",
      "198.18.0.1",
      "198.51.100.10",
      "203.0.113.10",
      "224.0.0.1",
      "240.0.0.1",
    ]) {
      expect(isPublicNotificationIPv4(address)).toBe(false);
    }

    expect(isPublicNotificationIPv4("8.8.8.8")).toBe(true);
    expect(isPublicNotificationIPv4("1.1.1.1")).toBe(true);
  });
});
