import { isIP } from "node:net";

export interface NotificationUrlCheck {
  ok: boolean;
  reason: string | null;
  requestedUrl: string;
  finalUrl: string | null;
  finalHost: string | null;
  httpStatus: number | null;
  contentType: string | null;
  redirectChain: string[];
  checkedAt: string;
}

export interface NotificationUrlCheckOptions {
  fetchImpl?: typeof fetch;
  maxRedirects?: number;
  timeoutMs?: number;
  now?: () => Date;
}

const AUTHORITY_DOMAINS = [
  "gov.in",
  "nic.in",
  "ac.in",
  "edu.in",
  "res.in",
  "mil.in",
  "hmtindia.com",
  "sbi.co.in",
  "ibps.in",
  "ongcindia.com",
  "ntpc.co.in",
  "iocl.com",
  "bharatpetroleum.in",
  "hindustanpetroleum.com",
  "gailonline.com",
  "bel-india.in",
  "bhel.com",
  "sail.co.in",
  "coalindia.in",
  "powergrid.in",
  "ecil.co.in",
  "rites.com",
  "ircon.org",
  "mazagondock.in",
  "grse.in",
  "nclcil.in",
  "nlcindia.in",
] as const;

const AGGREGATOR_DOMAINS = [
  "freejobalert.com",
  "sarkariresult.com",
  "sarkarinaukri.com",
  "indiasarkarinaukri.com",
  "sahisarkarijobs.com",
  "sarkariexam.com",
  "freshersworld.com",
] as const;

function hostMatchesDomain(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

function isPublicAuthorityHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\\.$/, "");
  if (!host || isIP(host) !== 0 || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) {
    return false;
  }
  if (AGGREGATOR_DOMAINS.some((domain) => hostMatchesDomain(host, domain))) return false;
  return AUTHORITY_DOMAINS.some((domain) => hostMatchesDomain(host, domain));
}

function parseCandidate(value: string): URL | null {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    if (url.username || url.password) return null;
    if (!isPublicAuthorityHost(url.hostname)) return null;
    return url;
  } catch {
    return null;
  }
}

/**
 * Reachability and destination-host check only. This deliberately uses HEAD:
 * it never downloads or parses a notification PDF/document body.
 */
export async function checkOfficialNotificationUrl(
  value: string,
  options: NotificationUrlCheckOptions = {},
): Promise<NotificationUrlCheck> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const maxRedirects = Math.max(0, Math.min(options.maxRedirects ?? 5, 5));
  const timeoutMs = Math.max(1000, Math.min(options.timeoutMs ?? 10000, 30000));
  const checkedAt = (options.now ?? (() => new Date()))().toISOString();
  const requestedUrl = value.trim();
  const redirectChain: string[] = [];
  const initial = parseCandidate(requestedUrl);

  const result = (
    ok: boolean,
    reason: string | null,
    finalUrl: string | null = null,
    httpStatus: number | null = null,
    contentType: string | null = null,
  ): NotificationUrlCheck => ({
    ok,
    reason,
    requestedUrl,
    finalUrl,
    finalHost: finalUrl ? new URL(finalUrl).hostname.toLowerCase() : null,
    httpStatus,
    contentType,
    redirectChain,
    checkedAt,
  });

  if (!initial) return result(false, "INVALID_OR_UNTRUSTED_NOTIFICATION_HOST");

  let current = initial;
  for (let redirects = 0; redirects <= maxRedirects; redirects++) {
    redirectChain.push(current.toString());

    let response: Response;
    try {
      response = await fetchImpl(current, {
        method: "HEAD",
        redirect: "manual",
        signal: AbortSignal.timeout(timeoutMs),
        headers: { accept: "application/pdf,text/html,application/octet-stream;q=0.9,*/*;q=0.1" },
      });
    } catch {
      return result(false, "HEAD_REQUEST_FAILED");
    }

    const contentType = response.headers.get("content-type");
    if (response.status >= 200 && response.status < 300) {
      return result(true, null, current.toString(), response.status, contentType);
    }

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) return result(false, "REDIRECT_WITHOUT_LOCATION", current.toString(), response.status, contentType);
      if (redirects === maxRedirects) return result(false, "TOO_MANY_REDIRECTS", current.toString(), response.status, contentType);
      let next: URL;
      try {
        next = new URL(location, current);
      } catch {
        return result(false, "INVALID_REDIRECT_LOCATION", current.toString(), response.status, contentType);
      }
      if (!parseCandidate(next.toString())) {
        return result(false, "REDIRECT_TO_UNTRUSTED_HOST", current.toString(), response.status, contentType);
      }
      current = next;
      continue;
    }

    if (response.status === 405 || response.status === 501) {
      return result(false, "HEAD_UNSUPPORTED_REQUIRES_REVIEW", current.toString(), response.status, contentType);
    }
    return result(false, `HTTP_${response.status}`, current.toString(), response.status, contentType);
  }

  return result(false, "TOO_MANY_REDIRECTS", current.toString());
}
