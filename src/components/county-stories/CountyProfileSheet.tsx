"use client";

import { useId, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ArrowRight, Play, X } from "lucide-react";
import type { CountyStoryCountyVisual } from "@/lib/county-stories/county-covers";
import { CountyStoryCover } from "./CountyStoryTile";
import { useCountyStoryModal } from "./useCountyStoryModal";
import styles from "./county-stories.module.css";

export function CountyProfileSheet({
  county,
  storyCount,
  onClose,
  onWatch,
}: {
  county: CountyStoryCountyVisual;
  storyCount: number;
  onClose: () => void;
  onWatch: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  useCountyStoryModal(dialogRef, onClose, closeRef);

  return createPortal(
    <div className={styles.overlay} data-county-profile-popup="" data-county={county.slug}>
      <div className={styles.backdrop} aria-hidden onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={styles.sheet}
      >
        <div className={styles.sheetCover}>
          <CountyStoryCover county={county} />
          <button
            ref={closeRef}
            type="button"
            className={styles.close}
            aria-label={`Close ${county.name}`}
            onClick={onClose}
          >
            <X aria-hidden />
          </button>
          <span className={styles.badge} data-county-badge="">
            {county.courthouse ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={county.courthouse.src} alt={county.courthouse.alt} decoding="async" />
            ) : (
              <span aria-hidden>{county.shortName.charAt(0)}</span>
            )}
          </span>
        </div>
        <div className={styles.sheetBody}>
          <h2 id={titleId} className={styles.sheetTitle}>
            {county.name}.
          </h2>
          {storyCount > 0 ? (
            <button type="button" className={styles.primary} onClick={onWatch} data-county-watch="">
              <Play aria-hidden />
              Watch stories
            </button>
          ) : (
            <p className={styles.emptyNote}>No County Stories yet today.</p>
          )}
          <Link href={county.href} className={styles.secondary} data-county-explore="">
            Explore {county.name}
            <ArrowRight aria-hidden />
          </Link>
        </div>
      </div>
    </div>,
    document.body,
  );
}
