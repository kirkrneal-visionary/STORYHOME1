import { notFound } from "next/navigation";
import { CountyLocalPlaceDirectory } from "@/components/county/CountyLocalPlaceDirectory";
import { P2F2A_MULTI_PLACE_LAYOUT_FIXTURE } from "@/lib/geo/county-places";

export const dynamic = "force-dynamic";

export default function P2F2APlaceLayoutFixturePage() {
  if (process.env.P2F2A_PLACE_FIXTURE !== "1") notFound();
  return (
    <main className="min-h-dvh px-4 pb-[var(--story-bottom-clearance)] pt-[calc(var(--story-safe-top)+2rem)] md:px-8">
      <p className="font-mono text-[11px] tracking-[0.14em] text-[var(--muted)] uppercase">
        Layout fixture
      </p>
      <div className="mx-auto max-w-5xl">
        <CountyLocalPlaceDirectory
          countyName="Polk County"
          places={P2F2A_MULTI_PLACE_LAYOUT_FIXTURE}
        />
      </div>
    </main>
  );
}
