export type OfficePageAccess = "login" | "refuse" | "allow";

export function officePageAccess(opts: {
  signedIn: boolean;
  purpose?: string | null;
}): OfficePageAccess {
  if (!opts.signedIn) return "login";
  if (opts.purpose === "managing_broker") return "allow";
  return "refuse";
}

export function officeRefuseCopy(purpose?: string | null): {
  title: string;
  body: string;
  href: string;
  cta: string;
} {
  if (purpose === "individual_pro") {
    return {
      title: "Personal Story Pro",
      body: "This login is your own realtor account. Office tools live on a separate office login.",
      href: "/settings",
      cta: "Open settings",
    };
  }
  return {
    title: "Office account",
    body: "Office tools are for the managing-broker login. They are not Story Pro.",
    href: "/settings",
    cta: "Open settings",
  };
}
