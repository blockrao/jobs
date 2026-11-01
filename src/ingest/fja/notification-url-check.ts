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
  /** Explicit official host(s) authorised for this recruitment, resolved from trusted source evidence. */
  approvedHosts?: string[];
  fetchImpl?: typeof fetch;
  maxRedirects?: number;
  timeoutMs?: number;
  now?: () => Date;
}

function normaliseApprovedHost(entry: string): string | null {
  try {
    const candidate = entry.trim().replace(/^\*\./, "");
    const url = new URL(candidate.includes("://") ? candidate : `https://${candidate}`);
    return url.hostname.toLowerCase().replace(/\.$/, "");
  } catch {
    return null;
  }
}

function isApprovedHost(hostname: string, approvedHosts: string[]): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (!host || isIP(host) !== 0 || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) {
    return false;
  }
  return approvedHosts.some((entry) => {
    const approved = normaliseApprovedHost(entry);
    return !!approved && (host === approved || host.endsWith(`.${approved}`));
  });
}

function parseCandidate(value: string, approvedHosts: string[]): URL | null {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    if (url.username || url.password) return null;
    if (!isApprovedHost(url.hostname, approvedHosts)) return null;
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
  const approvedHosts = options.approvedHosts ?? [];
  const initial = parseCandidate(requestedUrl, approvedHosts);

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
      if (!parseCandidate(next.toString(), approvedHosts)) {
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
