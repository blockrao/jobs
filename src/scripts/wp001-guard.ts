/** Refuse to touch anything but a local scratch database unless explicitly overridden. */
export function assertScratchDatabase(): void {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  let host = "";
  try {
    host = new URL(url).hostname;
  } catch {
    throw new Error("DATABASE_URL is not a valid URL");
  }
  const local = host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]";
  if (!local && process.env.WP001_ALLOW_REMOTE_DB !== "yes") {
    throw new Error(
      `Refusing to run against non-local database host "${host}". WP-001 tools write only to a local scratch database; ` +
        "a production write needs the backup gate and the owner's approval, then WP001_ALLOW_REMOTE_DB=yes.",
    );
  }
}
