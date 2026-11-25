import type { Metadata } from "next";
import { EmailLinkConfirm } from "@/components/auth/EmailLinkConfirm";
import { readEmailLink } from "@/lib/account/email-link";

export const metadata: Metadata = {
  title: "Email link",
  robots: { index: false, follow: false },
};

export default async function AuthConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{
    token_hash?: string | string[];
    type?: string | string[];
  }>;
}) {
  const link = readEmailLink(await searchParams);
  return <EmailLinkConfirm link={link} />;
}
