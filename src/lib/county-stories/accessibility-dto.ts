/**
 * Future Wave 7 viewer contract. Not a viewer. No job/transcript metadata.
 */
import type { CountyStoryCaptionCue } from "@/lib/county-stories/captions";

export type CountyStoryAccessibilityDto = {
  mediaId: string;
  language: string;
  captions: {
    format: "webvtt_cues";
    cues: Array<Pick<CountyStoryCaptionCue, "index" | "start_ms" | "end_ms" | "text">>;
  } | null;
  accessibleDescription: string | null;
  storyType: string | null;
  countyFips: string | null;
  countyName: string | null;
  professional: {
    displayName: string | null;
    license: string | null;
  };
};

export function toCountyStoryAccessibilityDto(input: {
  mediaId: string;
  language?: string | null;
  cues?: CountyStoryCaptionCue[] | null;
  accessibleDescription?: string | null;
  storyType?: string | null;
  countyFips?: string | null;
  countyName?: string | null;
  professionalDisplayName?: string | null;
  professionalLicense?: string | null;
  jobStatus?: string | null;
  providerId?: string | null;
}): CountyStoryAccessibilityDto {
  void input.jobStatus;
  void input.providerId;
  return {
    mediaId: input.mediaId,
    language: input.language?.trim() || "en",
    captions:
      input.cues && input.cues.length > 0
        ? {
            format: "webvtt_cues",
            cues: input.cues.map((cue) => ({
              index: cue.index,
              start_ms: cue.start_ms,
              end_ms: cue.end_ms,
              text: cue.text,
            })),
          }
        : null,
    accessibleDescription: input.accessibleDescription?.trim() || null,
    storyType: input.storyType ?? null,
    countyFips: input.countyFips ?? null,
    countyName: input.countyName ?? null,
    professional: {
      displayName: input.professionalDisplayName ?? null,
      license: input.professionalLicense ?? null,
    },
  };
}
