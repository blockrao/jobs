// Minimal shared-secret gate for the admin UI. Uses Web Crypto (available
// in both the Edge middleware runtime and Node server actions) so this file
// can be imported from either. Fails closed: if ADMIN_PASSWORD isn't set,
// no cookie value can ever match.
// Upgrade to real auth (e.g. Clerk) before opening this up to more than
// one trusted operator.

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function adminSessionToken(): Promise<string | null> {
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret) return null;
  return sha256Hex(secret);
}

export async function checkAdminPassword(input: string): Promise<boolean> {
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret) return false;
  // Compare hashes in constant time to avoid leaking length/prefix.
  const [a, b] = await Promise.all([sha256Hex(input), sha256Hex(secret)]);
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
