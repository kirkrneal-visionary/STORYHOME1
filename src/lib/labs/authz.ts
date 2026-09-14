import {
  labsRoleForEmail,
  parseEmailList,
  type LabsRole,
} from "@/lib/labs/env";

export function labsAllowLists(): {
  founder: string[];
  developer: string[];
  qa: string[];
} {
  return {
    founder: parseEmailList(process.env.STORY_LABS_FOUNDER_EMAILS),
    developer: parseEmailList(process.env.STORY_LABS_DEVELOPER_EMAILS),
    qa: parseEmailList(process.env.STORY_LABS_QA_EMAILS),
  };
}

export function resolveLabsRole(email: string | null | undefined): LabsRole | null {
  return labsRoleForEmail(email, labsAllowLists());
}

export function canUseFounderQa(role: LabsRole | null): boolean {
  return role === "founder" || role === "developer" || role === "qa";
}

export function canApproveRelease(role: LabsRole | null): boolean {
  return role === "founder";
}
