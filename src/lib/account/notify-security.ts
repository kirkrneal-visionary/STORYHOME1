/**
 * Synthetic security notices. Live mail is not sent from here.
 * Logs are for Labs / Wave 4 inboxes — never include secrets.
 */
export type SecurityNoticeKind =
  | "password_changed"
  | "email_change_requested"
  | "mfa_enrolled"
  | "mfa_removed"
  | "signed_out_everywhere"
  | "confirmation_resent"
  | "password_reset_requested";

export function notifySecurityChange(
  kind: SecurityNoticeKind,
  userId: string | null | undefined,
): void {
  console.info(
    JSON.stringify({
      t: "security-notify",
      kind,
      user: userId ? userId.slice(0, 8) : "anon",
      at: new Date().toISOString(),
    }),
  );
}
