/**
 * Confirms that a public link is hosted on the exact official issuer domain
 * registered for the Recruitment's official_link_source.
 *
 * Aggregator-discovered URLs, unknown source labels, lookalike domains,
 * non-HTTPS URLs and unparseable links are not official evidence.
 */
export function isVerifiedOfficialUrl(
  linkUrl: string | null | undefined,
  registryUrl: string | null | undefined,
): boolean {
  if (!linkUrl || !registryUrl) return false;

  try {
    const link = new URL(linkUrl);
    const registry = new URL(registryUrl);

    if (link.protocol !== "https:" || registry.protocol !== "https:") return false;
    if (link.username || link.password || registry.username || registry.password) return false;
    if ((link.port && link.port !== "443") || (registry.port && registry.port !== "443")) return false;

    const normalizeHost = (host: string) => host.toLowerCase().replace(/^www\./, "").replace(/\.$/, "");
    const linkHost = normalizeHost(link.hostname);
    const registryHost = normalizeHost(registry.hostname);

    return linkHost === registryHost || linkHost.endsWith(`.${registryHost}`);
  } catch {
    return false;
  }
}
