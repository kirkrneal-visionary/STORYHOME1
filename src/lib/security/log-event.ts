/**
 * Structured security events. Never log passwords, tokens, keys,
 * payment credentials, or private document contents.
 */

export type SecurityEventKind =
  | "authz_denied"
  | "seller_code_denied"
  | "seller_code_throttled"
  | "rate_limited"
  | "billing_webhook_rejected"
  | "billing_webhook_unconfigured"
  | "expensive_query_rejected"
  | "origin_rejected";

export type SecurityEvent = {
  kind: SecurityEventKind;
  path?: string;
  status?: number;
  ip?: string;
  /** Hashed or truncated only — never a raw token or passcode. */
  subject?: string;
};

export function logSecurityEvent(event: SecurityEvent): void {
  const line = {
    t: "security",
    at: new Date().toISOString(),
    kind: event.kind,
    path: event.path,
    status: event.status,
    ip: event.ip ? event.ip.slice(0, 64) : undefined,
    subject: event.subject ? event.subject.slice(0, 48) : undefined,
  };
  console.info(JSON.stringify(line));
}
