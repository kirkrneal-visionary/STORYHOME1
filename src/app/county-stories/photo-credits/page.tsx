import type { Metadata } from "next";
import {
  COUNTY_STORY_COUNTIES,
  countyPictureLicenseUrl,
  type CountyPictureCredit,
  type CountyPictureFile,
} from "@/lib/county-stories/county-covers";

export const metadata: Metadata = { title: "Photo Credits" };

function CreditItem({
  label,
  file,
  alt,
  credit,
  round = false,
}: {
  label: string;
  file: CountyPictureFile;
  alt: string;
  credit: CountyPictureCredit;
  round?: boolean;
}) {
  const licenseUrl = countyPictureLicenseUrl(credit.license);
  return (
    <li className="flex items-start gap-4" data-county-photo-credit-item="">
      <div className="flex w-[4.5rem] shrink-0 justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={file.src}
          srcSet={file.srcSet}
          sizes={round ? "64px" : "72px"}
          alt={alt}
          loading="lazy"
          decoding="async"
          className={
            round
              ? "h-16 w-16 rounded-full object-cover"
              : "h-[5.625rem] w-[4.5rem] rounded-xl object-cover"
          }
        />
      </div>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-ink">{label}</h3>
        <p className="mt-1 break-words">
          <a href={credit.sourceUrl} className="text-gold hover:underline">
            “{credit.title}”
          </a>{" "}
          by {credit.creator}, {credit.site},{" "}
          {licenseUrl ? (
            <a href={licenseUrl} rel="license" className="text-gold hover:underline">
              {credit.license}
            </a>
          ) : (
            "public domain"
          )}
          , cropped.
          {credit.license === "CC BY-SA 4.0" ? " Our cropped version is shared under the same license." : null}
          {credit.courtesy ? ` ${credit.courtesy}.` : null}
        </p>
      </div>
    </li>
  );
}

export default function CountyPhotoCreditsPage() {
  const counties = COUNTY_STORY_COUNTIES.filter((county) => county.cover || county.courthouse);
  return (
    <div
      className="story-room-pad min-h-dvh px-4 pb-[var(--story-bottom-clearance)] md:px-6"
      data-county-photo-credits=""
    >
      <div className="mx-auto max-w-3xl">
        <h1 className="type-page-title text-ink">Photo Credits</h1>
        <p className="mt-8 text-base leading-relaxed text-[var(--muted)]">
          The county pictures in County Stories were shared by the photographers below under
          the licenses shown. We cropped each one to fit. Using a picture here does not mean
          its photographer endorses Story Home.
        </p>
        {counties.map((county) => (
          <section
            key={county.fips}
            id={county.slug}
            aria-labelledby={`${county.slug}-credits`}
            className="mt-10 scroll-mt-28"
          >
            <h2 id={`${county.slug}-credits`} className="type-card-title text-ink">
              {county.name}
            </h2>
            <ul className="mt-4 space-y-5 text-base leading-relaxed text-[var(--muted)]">
              {county.cover ? (
                <CreditItem
                  label="Cover photo"
                  file={county.cover.tile}
                  alt={county.cover.alt}
                  credit={county.cover.credit}
                />
              ) : null}
              {county.courthouse ? (
                <CreditItem
                  label="Courthouse photo"
                  file={county.courthouse.badge}
                  alt={county.courthouse.alt}
                  credit={county.courthouse.credit}
                  round
                />
              ) : null}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
