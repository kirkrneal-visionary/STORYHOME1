"use client";

/**
 * Shows the sharp recording on the blurred source.
 * This is the Story Home presentation. It is not a control the professional sets.
 */

export function CountyStoryPresentedVideo({ url }: { url: string | null }) {
  return (
    <div
      className="relative mx-auto aspect-[9/16] w-full max-w-sm overflow-hidden rounded-md bg-black"
      data-county-story-background="blur"
    >
      {url ? (
        <video
          className="absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-2xl"
          src={url}
          muted
          playsInline
          autoPlay
          loop
          aria-hidden="true"
        />
      ) : null}
      {url ? (
        <video
          className="relative z-[1] h-full w-full object-contain"
          src={url}
          controls
          playsInline
          data-county-story-sharp-video
        />
      ) : (
        <p className="relative z-[1] px-4 pt-16 text-sm text-[var(--muted)]">Your video will appear here when it is ready.</p>
      )}
    </div>
  );
}
