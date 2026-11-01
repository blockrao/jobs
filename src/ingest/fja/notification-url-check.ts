import { lookup as dnsLookup } from "node:dns/promises";
import { isIP } from "node:net";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";

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
  /** Test seam. Production uses the DNS-pinned HEAD implementation below. */
  fetchImpl?: typeof fetch;
  maxRedirects?: number;
  timeoutMs?: number;
  now?: () => Date;
}

interface HeadResponse {
  status: number;
  headers: { get(name: string): string | null };
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
    const raw = entry.trim();
    const explicitlyAllowsSubdomains = raw.startsWith("*.");
    const approved = normaliseApprovedHost(raw);
    return !!approved && (
      host === approved ||
      (explicitlyAllowsSubdomains && host.endsWith(`.${approved}`))
    );
  });
}

function parseCandidate(value: string, approvedHosts: string[]): URL | null {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    if (url.username || url.password) return null;
    if (url.port) return null;
    if (!isApprovedHost(url.hostname, approvedHosts)) return null;
    return url;
  } catch {
    return null;
  }
}

function ipv4Number(address: string): number | null {
  const parts = address.split(".");
  if (parts.length !== 4) return null;
  const octets = parts.map(Number);
  if (octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return null;
  return (((octets[0] * 256 + octets[1]) * 256 + octets[2]) * 256 + octets[3]) >>> 0;
}

function inIpv4Range(address: number, base: string, prefix: number): boolean {
  const start = ipv4Number(base);
  if (start === null) return true;
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (address & mask) === (start & mask);
}

/** True only for globally routable unicast IPv4 addresses. */
export function isPublicNotificationIPv4(value: string): boolean {
  if (isIP(value) !== 4) return false;
  const address = ipv4Number(value);
  if (address === null) return false;
  const blocked: Array<[string, number]> = [
    ["0.0.0.0", 8],
    ["10.0.0.0", 8],
    ["100.64.0.0", 10],
    ["127.0.0.0", 8],
    ["169.254.0.0", 16],
    ["172.16.0.0", 12],
    ["192.0.0.0", 24],
    ["192.0.2.0", 24],
    ["192.88.99.0", 24],
    ["192.168.0.0", 16],
    ["198.18.0.0", 15],
    ["198.51.100.0", 24],
    ["203.0.113.0", 24],
    ["224.0.0.0", 4],
    ["240.0.0.0", 4],
  ];
  return !blocked.some(([base, prefix]) => inIpv4Range(address, base, prefix));
}

/**
 * Resolve once, reject private/reserved IPv4 answers, then pin the actual HEAD
 * connection to the selected address. TLS SNI and the HTTP Host header retain
 * the approved hostname. Redirects are resolved and pinned independently.
 */
async function dnsPinnedHead(url: URL, timeoutMs: number): Promise<HeadResponse> {
  let dnsTimer: ReturnType<typeof setTimeout> | undefined;
  let addresses: Awaited<ReturnType<typeof dnsLookup>>;
  try {
    addresses = await Promise.race([
      dnsLookup(url.hostname, { all: true, verbatim: true }),
      new Promise<never>((_, reject) => {
        dnsTimer = setTimeout(() => reject(new Error("DNS_LOOKUP_TIMEOUT")), timeoutMs);
      }),
    ]);
  } finally {
    if (dnsTimer) clearTimeout(dnsTimer);
  }
  if (!addresses.length || addresses.some((entry) => entry.family === 4 && !isPublicNotificationIPv4(entry.address))) {
    throw new Error("DNS_RESOLVED_TO_NON_PUBLIC_ADDRESS");
  }
  const selected = addresses.find((entry) => entry.family === 4 && isPublicNotificationIPv4(entry.address));
  if (!selected) throw new Error("NO_PUBLIC_IPV4_ADDRESS");

  const perform = () => new Promise<HeadResponse>((resolve, reject) => {
    const requestOptions = {
      method: "HEAD",
      headers: { accept: "application/pdf,text/html,application/octet-stream;q=0.9,*/*;q=0.1" },
      servername: url.hostname,
      // Pin the socket lookup to the address checked above; do not resolve again.
      lookup: ((_hostname: string, _options: unknown, callback: (error: NodeJS.ErrnoException | null, address: string, family: number) => void) => {
        callback(null, selected.address, 4);
      }) as never,
    };
    const request = (url.protocol === "https:" ? httpsRequest : httpRequest)(
      url,
      requestOptions,
      (response) => {
        const rawContentType = response.headers["content-type"];
        const contentType = Array.isArray(rawContentType) ? rawContentType[0] : rawContentType ?? null;
        const rawLocation = response.headers.location;
        const location = Array.isArray(rawLocation) ? rawLocation[0] : rawLocation ?? null;
        response.resume();
        resolve({
          status: response.statusCode ?? 0,
          headers: {
            get: (name: string) => {
              if (name.toLowerCase() === "content-type") return contentType;
              if (name.toLowerCase() === "location") return location;
              return null;
            },
          },
        });
      },
    );
    request.once("error", reject);
    request.setTimeout(timeoutMs, () => request.destroy(new Error("HEAD_REQUEST_TIMEOUT")));
    request.end();
  });

  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      perform(),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error("HEAD_REQUEST_TIMEOUT")), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
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

    let response: HeadResponse;
    try {
      response = options.fetchImpl
        ? await options.fetchImpl(current, {
            method: "HEAD",
            redirect: "manual",
            signal: AbortSignal.timeout(timeoutMs),
            headers: { accept: "application/pdf,text/html,application/octet-stream;q=0.9,*/*;q=0.1" },
          })
        : await dnsPinnedHead(current, timeoutMs);
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
