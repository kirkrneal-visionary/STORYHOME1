import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { UsernamePublicStub } from "@/components/username/UsernamePublicStub";
import {
  canonicalUsernameParam,
  needsUsernameCanonicalRedirect,
  publicUsernamePath,
} from "@/lib/account/username-public";
import { resolvePublicUsername } from "@/lib/account/username-public-resolve";

type PageProps = {
  params: Promise<{ username: string }>;
};

export const dynamic = "force-dynamic";

const NOINDEX: Metadata["robots"] = { index: false, follow: false };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { username } = await params;
  const stub = await resolvePublicUsername(username);
  if (!stub) {
    return {
      title: "Not found",
      robots: NOINDEX,
    };
  }
  return {
    title: `@${stub.username}`,
    robots: NOINDEX,
  };
}

export default async function PublicUsernamePage({ params }: PageProps) {
  const { username } = await params;
  const canonical = canonicalUsernameParam(username);
  if (!canonical) notFound();
  if (needsUsernameCanonicalRedirect(username, canonical)) {
    permanentRedirect(publicUsernamePath(canonical));
  }
  const stub = await resolvePublicUsername(canonical);
  if (!stub) notFound();
  return <UsernamePublicStub stub={stub} />;
}
