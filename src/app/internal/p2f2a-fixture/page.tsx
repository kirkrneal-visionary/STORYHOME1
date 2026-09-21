import { notFound } from "next/navigation";
import { CountyIdentityShell } from "@/components/county/CountyIdentityShell";
import { CountyLocalPlaceDirectory } from "@/components/county/CountyLocalPlaceDirectory";
import { P2F2A_MULTI_PLACE_LAYOUT_FIXTURE } from "@/lib/geo/county-places";

export const dynamic = "force-dynamic";

export default function P2F2APlaceLayoutFixturePage() {
  if (process.env.P2F2A_PLACE_FIXTURE !== "1") notFound();
  return (
    <>
      <p className="px-4 pt-[calc(var(--story-safe-top)+0.75rem)] font-mono text-[11px] tracking-[0.14em] text-[var(--muted)] uppercase md:px-8">
        Layout fixture
      </p>
      <CountyIdentityShell
        identity={{ canonicalName: "Polk County", state: "TX" }}
      >
        <CountyLocalPlaceDirectory
          countyName="Polk County"
          countySlug="polk"
          places={P2F2A_MULTI_PLACE_LAYOUT_FIXTURE}
        />
      </CountyIdentityShell>
    </>
  );
}
