/**
 * Synthetic security notices. Live mail is not sent from here.
 * The Labs inbox is process-local — never include secrets.
 */

export type SecurityNoticeKind =
  | "password_changed"
  | "email_change_requested"
  | "mfa_enrolled"
  | "mfa_removed"
  | "signed_out_everywhere"
  | "confirmation_resent"
  | "password_reset_requested"
  | "office_opened"
  | "account_deleted";

export type SecurityNotice = {
  id: string;
  kind: SecurityNoticeKind;
  userKey: string;
  at: string;
};

const notices: SecurityNotice[] = [];
const MAX = 200;

export function noticeLabel(kind: SecurityNoticeKind): string {
  switch (kind) {
    case "password_changed":
      return "Password changed";
    case "email_change_requested":
      return "Email change started";
    case "mfa_enrolled":
      return "Authenticator added";
    case "mfa_removed":
      return "Authenticator removed";
    case "signed_out_everywhere":
      return "Signed out everywhere";
    case "confirmation_resent":
      return "Confirmation email resent";
    case "password_reset_requested":
      return "Password reset requested";
    case "office_opened":
      return "This login became the office account";
    case "account_deleted":
      return "Account deleted";
    default:
      return "Account security change";
  }
}

export function recordSecurityNotice(
  kind: SecurityNoticeKind,
  userId: string | null | undefined,
): SecurityNotice {
  const notice: SecurityNotice = {
    id: `${Date.now()}-${notices.length}`,
    kind,
    userKey: userId ? userId.slice(0, 8) : "anon",
    at: new Date().toISOString(),
  };
  notices.unshift(notice);
  if (notices.length > MAX) notices.pop();
  return notice;
}

export function listSecurityNotices(userId: string): SecurityNotice[] {
  const key = userId.slice(0, 8);
  return notices.filter((n) => n.userKey === key);
}

export function resetSecurityInboxForTests(): void {
  notices.length = 0;
}

export function notifySecurityChange(
  kind: SecurityNoticeKind,
  userId: string | null | undefined,
): void {
  recordSecurityNotice(kind, userId);
  console.info(
    JSON.stringify({
      t: "security-notify",
      kind,
      user: userId ? userId.slice(0, 8) : "anon",
      at: new Date().toISOString(),
    }),
  );
}
