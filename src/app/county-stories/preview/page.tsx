import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CountyStoryPreview } from "@/components/county-stories/CountyStoryPreview";

export const metadata: Metadata = {
  title: "County Story composer preview",
  robots: { index: false, follow: false },
};

export default function CountyStoryPreviewPage() {
  const allowed = process.env.NODE_ENV !== "production" || process.env.VERCEL_ENV === "preview";
  if (!allowed) notFound();
  return <CountyStoryPreview />;
}
