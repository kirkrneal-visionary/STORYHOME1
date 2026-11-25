import { Fragment } from "react";
import Link from "next/link";
import {
  COUNTY_PHOTO_CREDITS_PATH,
  countyPictureLicenseUrl,
  countyPopupPhotoCredits,
  type CountyStoryCountyVisual,
} from "@/lib/county-stories/county-covers";
import styles from "./county-stories.module.css";

export function CountyPhotoCredit({ county }: { county: CountyStoryCountyVisual }) {
  if (!county.cover && !county.courthouse) return null;
  const credits = countyPopupPhotoCredits(county);
  return (
    <p className={styles.credit} data-county-photo-credit="">
      {credits.length > 0 ? "Photos: " : null}
      {credits.map((credit) => {
        const licenseUrl = countyPictureLicenseUrl(credit.license);
        return (
          <Fragment key={credit.sourceUrl}>
            <a href={credit.sourceUrl} target="_blank" rel="noopener noreferrer">
              {credit.creator}
            </a>{" "}
            (
            {licenseUrl ? (
              <a href={licenseUrl} target="_blank" rel="license noopener noreferrer">
                {credit.license}
              </a>
            ) : (
              credit.license
            )}
            ){" · "}
          </Fragment>
        );
      })}
      <Link href={`${COUNTY_PHOTO_CREDITS_PATH}#${county.slug}`}>Photo credits</Link>
    </p>
  );
}
