import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CountyStoryPreview } from "@/components/county-stories/CountyStoryPreview";

export const metadata: Metadata = {
  title: "County Story composer preview",
  robots: { index: false, follow: false },
};

export default async function CountyStoryPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{
    clean?: string;
    screen?: string;
    hub?: string;
    layout?: string;
    removed?: string;
    why?: string;
    resume?: string;
  }>;
}) {
  const allowed = process.env.NODE_ENV !== "production" || process.env.VERCEL_ENV === "preview";
  if (!allowed) notFound();
  const params = await searchParams;
  return (
    <CountyStoryPreview
      clean={params.clean === "1"}
      initialScreen={params.screen}
      initialHub={params.hub}
      initialLayout={params.layout}
      showRemoval={params.removed === "1"}
      showPauseReasons={params.why === "1"}
      resume={params.resume === "replace" ? "replace" : params.resume === "create" ? "create" : null}
    />
  );
}
