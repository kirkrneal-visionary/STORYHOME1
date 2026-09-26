/**
 * County Stories transcription adapter.
 * Mux is the first provider adapter. Application logic stays behind this boundary.
 */
import type { CountyStoryCaptionCue } from "@/lib/county-stories/captions";
import { countyStoryMuxConfigured } from "@/lib/county-stories/mux-env";
import { MuxCountyStoryTranscriptionProvider } from "@/lib/county-stories/mux-provider";

export type CountyStoryTranscriptionInput = {
  mediaId: string;
  ownerId: string;
  storagePath: string;
  durationMs: number | null;
};

export type CountyStoryTranscriptionResult =
  | {
      ok: true;
      providerId: string;
      language: string;
      cues: CountyStoryCaptionCue[];
    }
  | {
      ok: false;
      providerId: string;
      code: "PROVIDER_UNAVAILABLE" | "TRANSCRIPTION_FAILED";
      error: string;
    };

export interface CountyStoryTranscriptionProvider {
  readonly id: string;
  transcribe(
    input: CountyStoryTranscriptionInput,
  ): Promise<CountyStoryTranscriptionResult>;
}

export class UnconfiguredCountyStoryTranscriptionProvider
  implements CountyStoryTranscriptionProvider
{
  readonly id = "unconfigured";

  async transcribe(): Promise<CountyStoryTranscriptionResult> {
    return {
      ok: false,
      providerId: this.id,
      code: "PROVIDER_UNAVAILABLE",
      error: "No approved transcription provider is configured.",
    };
  }
}

export function countyStoryTranscriptionProvider(): CountyStoryTranscriptionProvider {
  if (countyStoryMuxConfigured()) {
    return new MuxCountyStoryTranscriptionProvider();
  }
  return new UnconfiguredCountyStoryTranscriptionProvider();
}
