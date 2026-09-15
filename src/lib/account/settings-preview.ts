/**
 * View as buyer is a preview. It does not change the account on file.
 * This module has no runtime @/ imports so Node tests can load it.
 */

export function settingsBuyerPreview(opts: {
  role: "consumer" | "professional";
  mayUseStoryPro: boolean;
}): boolean {
  return opts.mayUseStoryPro && opts.role === "consumer";
}

export function settingsBuyerPreviewCopy(
  name: string,
  isOffice: boolean,
): string {
  const who = name.trim() || "this";
  if (isOffice) {
    return `This is still ${who}'s office login, previewing as a buyer.`;
  }
  return `This is still ${who}'s Story Pro login, previewing as a buyer.`;
}
