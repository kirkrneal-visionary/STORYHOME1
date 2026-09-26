/**
 * Server-only Mux Video client for County Stories.
 * Creates signed HLS assets. Never requests static MP4 renditions.
 */
import { readCountyStoryMuxEnv, type CountyStoryMuxEnv } from "@/lib/county-stories/mux-env";
import { signMuxPlaybackToken } from "@/lib/county-stories/mux-playback";

export type MuxPlaybackId = {
  id: string;
  policy: string;
};

export type MuxCreateAssetInput = {
  sourceUrl: string;
  mediaId?: string;
  generateEnglishCaptions?: boolean;
};

export type MuxCreatedAsset = {
  assetId: string;
  playbackIds: MuxPlaybackId[];
};

export type MuxAssetTrack = {
  id: string;
  type: string;
  languageCode: string | null;
  status: string | null;
  textSource: string | null;
};

export type MuxAssetSnapshot = {
  assetId: string;
  status: string;
  durationSec: number | null;
  playbackIds: MuxPlaybackId[];
  tracks: MuxAssetTrack[];
};

export interface CountyStoryMuxClient {
  readonly configured: boolean;
  createAsset(input: MuxCreateAssetInput): Promise<MuxCreatedAsset>;
  deleteAsset(assetId: string): Promise<{ gone: boolean }>;
  getAsset(assetId: string): Promise<MuxAssetSnapshot | null>;
  fetchTrackVtt(opts: {
    assetId: string;
    trackId: string;
    playbackId: string;
  }): Promise<string>;
}

export class UnconfiguredCountyStoryMuxClient implements CountyStoryMuxClient {
  readonly configured = false;

  async createAsset(): Promise<MuxCreatedAsset> {
    throw new Error("PROVIDER_UNAVAILABLE");
  }
  async deleteAsset(): Promise<{ gone: boolean }> {
    throw new Error("PROVIDER_UNAVAILABLE");
  }
  async getAsset(): Promise<MuxAssetSnapshot | null> {
    return null;
  }
  async fetchTrackVtt(): Promise<string> {
    throw new Error("PROVIDER_UNAVAILABLE");
  }
}

function basicAuth(env: CountyStoryMuxEnv): string {
  return Buffer.from(`${env.tokenId}:${env.tokenSecret}`).toString("base64");
}

function asPlaybackIds(value: unknown): MuxPlaybackId[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => {
      const rec = row as { id?: unknown; policy?: unknown };
      if (typeof rec.id !== "string" || !rec.id.trim()) return null;
      return {
        id: rec.id.trim(),
        policy: typeof rec.policy === "string" ? rec.policy : "",
      };
    })
    .filter((row): row is MuxPlaybackId => !!row);
}

function asTracks(value: unknown): MuxAssetTrack[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => {
      const rec = row as {
        id?: unknown;
        type?: unknown;
        language_code?: unknown;
        status?: unknown;
        text_source?: unknown;
      };
      if (typeof rec.id !== "string" || !rec.id.trim()) return null;
      return {
        id: rec.id.trim(),
        type: typeof rec.type === "string" ? rec.type : "",
        languageCode: typeof rec.language_code === "string" ? rec.language_code : null,
        status: typeof rec.status === "string" ? rec.status : null,
        textSource: typeof rec.text_source === "string" ? rec.text_source : null,
      };
    })
    .filter((row): row is MuxAssetTrack => !!row);
}

export function muxCreateAssetBody(input: MuxCreateAssetInput): Record<string, unknown> {
  const source: Record<string, unknown> = { url: input.sourceUrl };
  if (input.generateEnglishCaptions !== false) {
    source.generated_subtitles = [
      { language_code: "en", name: "English" },
    ];
  }
  return {
    input: [source],
    playback_policy: ["signed"],
    ...(input.mediaId ? { passthrough: input.mediaId } : {}),
  };
}

export class LiveCountyStoryMuxClient implements CountyStoryMuxClient {
  readonly configured = true;
  private readonly env: CountyStoryMuxEnv;

  constructor(env: CountyStoryMuxEnv) {
    this.env = env;
  }

  private async request(
    method: string,
    path: string,
    body?: Record<string, unknown>,
  ): Promise<{ status: number; json: unknown }> {
    const res = await fetch(`https://api.mux.com${path}`, {
      method,
      headers: {
        Authorization: `Basic ${basicAuth(this.env)}`,
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    let json: unknown = null;
    const text = await res.text();
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        json = { raw: text };
      }
    }
    return { status: res.status, json };
  }

  async createAsset(input: MuxCreateAssetInput): Promise<MuxCreatedAsset> {
    const body = muxCreateAssetBody(input);
    if ("mp4_support" in body) {
      throw new Error("static_mp4_rendition_forbidden");
    }
    const { status, json } = await this.request("POST", "/video/v1/assets", body);
    const data = (json as { data?: { id?: unknown; playback_ids?: unknown } })?.data;
    if (status >= 400 || typeof data?.id !== "string") {
      throw new Error("TRANSCRIPTION_FAILED");
    }
    return {
      assetId: data.id,
      playbackIds: asPlaybackIds(data.playback_ids),
    };
  }

  async deleteAsset(assetId: string): Promise<{ gone: boolean }> {
    const { status } = await this.request("DELETE", `/video/v1/assets/${assetId}`);
    if (status === 204 || status === 404) return { gone: true };
    return { gone: false };
  }

  async getAsset(assetId: string): Promise<MuxAssetSnapshot | null> {
    const { status, json } = await this.request("GET", `/video/v1/assets/${assetId}`);
    if (status === 404) return null;
    const data = (json as {
      data?: {
        id?: unknown;
        status?: unknown;
        duration?: unknown;
        playback_ids?: unknown;
        tracks?: unknown;
      };
    })?.data;
    if (status >= 400 || typeof data?.id !== "string") return null;
    return {
      assetId: data.id,
      status: typeof data.status === "string" ? data.status : "",
      durationSec: typeof data.duration === "number" ? data.duration : null,
      playbackIds: asPlaybackIds(data.playback_ids),
      tracks: asTracks(data.tracks),
    };
  }

  async fetchTrackVtt(opts: {
    assetId: string;
    trackId: string;
    playbackId: string;
  }): Promise<string> {
    const token = signMuxPlaybackToken({
      playbackId: opts.playbackId,
      env: this.env,
      ttlSec: 120,
    });
    if (!token) throw new Error("PROVIDER_UNAVAILABLE");
    const url = `https://stream.mux.com/${opts.playbackId}/text/${opts.trackId}.vtt?token=${token}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("TRANSCRIPTION_FAILED");
    return await res.text();
  }
}

let injected: CountyStoryMuxClient | null = null;

export function countyStoryMuxClient(): CountyStoryMuxClient {
  if (injected) return injected;
  const env = readCountyStoryMuxEnv();
  if (!env) return new UnconfiguredCountyStoryMuxClient();
  return new LiveCountyStoryMuxClient(env);
}

export function setCountyStoryMuxClientForTests(
  client: CountyStoryMuxClient | null,
): void {
  injected = client;
}

export function pickSignedMuxPlaybackId(
  playbackIds: MuxPlaybackId[],
): MuxPlaybackId | null {
  const signed = playbackIds.find((row) => row.policy === "signed" && row.id);
  return signed ?? null;
}

export function muxAssetHasPublicPlayback(playbackIds: MuxPlaybackId[]): boolean {
  return playbackIds.some((row) => row.policy === "public");
}
