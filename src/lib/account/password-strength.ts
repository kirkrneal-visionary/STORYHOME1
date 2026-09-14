/**
 * Password strength for the create-account and change-password forms.
 * Live Auth also rejects passwords already in public leak lists.
 */

export type PasswordStrength = "empty" | "weak" | "fair" | "good" | "strong";

export const WEAK_PASSWORD_COPY =
  "That password is too common. Use a longer phrase — not a name plus 1234.";

export const SIGNUP_GENERIC_COPY =
  "Unable to create this account. Try again or sign in.";

const EASY_BITS = [
  "password",
  "1234",
  "123456",
  "qwerty",
  "letmein",
  "welcome",
  "abc123",
  "admin",
  "apple",
  "summer",
  "winter",
  "iloveyou",
];

function hasEasyBit(password: string): boolean {
  const lower = password.toLowerCase();
  return EASY_BITS.some((bit) => lower.includes(bit));
}

function hintParts(name?: string, email?: string): string[] {
  const parts: string[] = [];
  const nameBits = (name ?? "").toLowerCase().split(/[^a-z0-9]+/).filter((p) => p.length >= 3);
  parts.push(...nameBits);
  const local = (email ?? "").split("@")[0]?.toLowerCase() ?? "";
  if (local.length >= 3) parts.push(local);
  return parts;
}

function usesHint(password: string, name?: string, email?: string): boolean {
  const lower = password.toLowerCase();
  return hintParts(name, email).some((p) => lower.includes(p));
}

export function scorePassword(
  password: string,
  hints: { name?: string; email?: string } = {},
): {
  level: PasswordStrength;
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  hint: string;
} {
  if (!password) {
    return { level: "empty", score: 0, label: "", hint: "" };
  }

  const classes = [
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;

  const easy = hasEasyBit(password) || usesHint(password, hints.name, hints.email);
  if (easy || password.length < 8) {
    return {
      level: "weak",
      score: 1,
      label: "Weak",
      hint: "Avoid names and 1234. Try a longer phrase.",
    };
  }

  if (password.length < 12 || classes < 3) {
    return {
      level: "fair",
      score: 2,
      label: "Fair",
      hint: "Add length. A short phrase is stronger than symbols alone.",
    };
  }

  if (password.length < 14 || classes < 4) {
    return {
      level: "good",
      score: 3,
      label: "Good",
      hint: "A few more words makes this harder to guess.",
    };
  }

  return {
    level: "strong",
    score: 4,
    label: "Strong",
    hint: "This looks hard to guess.",
  };
}

export function signUpPublicMessage(error: {
  message?: string;
  code?: string;
} | null | undefined): string {
  const code = (error?.code ?? "").toLowerCase();
  const msg = (error?.message ?? "").toLowerCase();
  if (
    code === "weak_password" ||
    msg.includes("weak") ||
    msg.includes("easy to guess") ||
    msg.includes("pwned")
  ) {
    return WEAK_PASSWORD_COPY;
  }
  if (
    code === "user_already_exists" ||
    msg.includes("already registered") ||
    msg.includes("already exists")
  ) {
    return "That email already has an account. Sign in or reset the password.";
  }
  return SIGNUP_GENERIC_COPY;
}
