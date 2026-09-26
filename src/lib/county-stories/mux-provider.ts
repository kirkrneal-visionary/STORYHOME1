/**
 * Mux adapter behind CountyStoryTranscriptionProvider.
 * Application logic talks to the adapter, not Mux HTTP.
 */
import type {
  CountyStoryTranscriptionInput,
  CountyStoryTranscriptionProvider,
  CountyStoryTranscriptionResult,
} from "@/lib/county-stories/transcription-provider";
import {
  countyStoryMuxClient,
  pickSignedMuxPlaybackId,
  type CountyStoryMuxClient,
} from "@/lib/county-stories/mux-client";
import { parseMuxWebVttCues } from "@/lib/county-stories/mux-vtt";

export class MuxCountyStoryTranscriptionProvider
  implements CountyStoryTranscriptionProvider
{
  readonly id = "mux";

  constructor(private readonly client: CountyStoryMuxClient = countyStoryMuxClient()) {}

  async transcribe(
    input: CountyStoryTranscriptionInput & {
      assetId?: string;
      trackId?: string;
      playbackId?: string;
    },
  ): Promise<CountyStoryTranscriptionResult> {
    if (!this.client.configured) {
      return {
        ok: false,
        providerId: this.id,
        code: "PROVIDER_UNAVAILABLE",
        error: "Mux is not configured.",
      };
    }
    if (!input.assetId || !input.trackId || !input.playbackId) {
      return {
        ok: false,
        providerId: this.id,
        code: "TRANSCRIPTION_FAILED",
        error: "Mux caption track is not ready.",
      };
    }
    try {
      const vtt = await this.client.fetchTrackVtt({
        assetId: input.assetId,
        trackId: input.trackId,
        playbackId: input.playbackId,
      });
      const cues = parseMuxWebVttCues(vtt);
      if (!cues.length) {
        return {
          ok: false,
          providerId: this.id,
          code: "TRANSCRIPTION_FAILED",
          error: "Mux caption track had no cues.",
        };
      }
      return {
        ok: true,
        providerId: this.id,
        language: "en",
        cues,
      };
    } catch {
      return {
        ok: false,
        providerId: this.id,
        code: "TRANSCRIPTION_FAILED",
        error: "Mux caption import failed.",
      };
    }
  }
}

export function muxSignedPlaybackOrNull(
  playbackIds: { id: string; policy: string }[],
): { id: string; policy: "signed" } | null {
  const signed = pickSignedMuxPlaybackId(playbackIds);
  if (!signed) return null;
  return { id: signed.id, policy: "signed" };
}
