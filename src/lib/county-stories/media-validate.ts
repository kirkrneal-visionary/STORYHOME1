/**
 * Server-side County Story video validation.
 * Browser duration / filename extensions are not authority.
 */
import {
  COUNTY_STORY_MEDIA_CODECS,
  COUNTY_STORY_MEDIA_MAX_BYTES,
  COUNTY_STORY_MEDIA_MAX_DURATION_MS,
  type CountyStoryValidationCode,
} from "@/lib/county-stories/media";

export type CountyStoryVideoProbe = {
  container: "mp4" | "quicktime" | "webm" | "unknown";
  codec: string | null;
  hasVideoTrack: boolean;
  durationMs: number | null;
};

export type CountyStoryValidateOk = {
  ok: true;
  probe: CountyStoryVideoProbe;
};

export type CountyStoryValidateFail = {
  ok: false;
  code: CountyStoryValidationCode;
  detail: string;
  probe?: CountyStoryVideoProbe;
};

const CODEC_OK = new Set<string>(COUNTY_STORY_MEDIA_CODECS);

function fail(
  code: CountyStoryValidationCode,
  detail: string,
  probe?: CountyStoryVideoProbe,
): CountyStoryValidateFail {
  return { ok: false, code, detail, probe };
}

function looksJpeg(buf: Buffer): boolean {
  return buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
}

function looksPng(buf: Buffer): boolean {
  return (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  );
}

function looksGif(buf: Buffer): boolean {
  return buf.length >= 6 && buf.subarray(0, 6).toString("ascii").startsWith("GIF8");
}

function looksWebp(buf: Buffer): boolean {
  return (
    buf.length >= 12 &&
    buf.subarray(0, 4).toString("ascii") === "RIFF" &&
    buf.subarray(8, 12).toString("ascii") === "WEBP"
  );
}

function looksWebm(buf: Buffer): boolean {
  return (
    buf.length >= 4 &&
    buf[0] === 0x1a &&
    buf[1] === 0x45 &&
    buf[2] === 0xdf &&
    buf[3] === 0xa3
  );
}

function ftypBrand(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  const size = buf.readUInt32BE(0);
  if (size < 16 || buf.toString("ascii", 4, 8) !== "ftyp") return null;
  return buf.toString("ascii", 8, 12);
}

function walkBoxes(
  buf: Buffer,
  start: number,
  end: number,
  visit: (type: string, payloadStart: number, payloadEnd: number) => void,
) {
  let off = start;
  while (off + 8 <= end) {
    let size = buf.readUInt32BE(off);
    const type = buf.toString("ascii", off + 4, off + 8);
    let header = 8;
    if (size === 1) {
      if (off + 16 > end) break;
      size = Number(buf.readBigUInt64BE(off + 8));
      header = 16;
    } else if (size === 0) {
      size = end - off;
    }
    if (!Number.isFinite(size) || size < header || off + size > end) break;
    visit(type, off + header, off + size);
    off += size;
  }
}

function readMp4(buf: Buffer): CountyStoryVideoProbe {
  let timescale = 0;
  let durationUnits = 0;
  let hasVideoTrack = false;
  let codec: string | null = null;
  const brand = ftypBrand(buf);
  const container: CountyStoryVideoProbe["container"] =
    brand === "qt  " ? "quicktime" : "mp4";

  const visit = (type: string, a: number, b: number) => {
    if (type === "moov" || type === "trak" || type === "mdia" || type === "minf" || type === "stbl") {
      walkBoxes(buf, a, b, visit);
      return;
    }
    if (type === "mvhd" && b - a >= 20) {
      const version = buf[a];
      if (version === 1 && b - a >= 32) {
        timescale = buf.readUInt32BE(a + 20);
        durationUnits = Number(buf.readBigUInt64BE(a + 24));
      } else if (version === 0) {
        timescale = buf.readUInt32BE(a + 12);
        durationUnits = buf.readUInt32BE(a + 16);
      }
      return;
    }
    if (type === "hdlr" && b - a >= 12) {
      const handler = buf.toString("ascii", a + 8, a + 12);
      if (handler === "vide") hasVideoTrack = true;
      return;
    }
    if (type === "stsd" && b - a >= 16) {
      const entryCount = buf.readUInt32BE(a + 4);
      if (entryCount >= 1) {
        codec = buf.toString("ascii", a + 12, a + 16);
      }
    }
  };
  walkBoxes(buf, 0, buf.length, visit);
  const durationMs =
    timescale > 0
      ? Math.round((durationUnits * 1000) / timescale)
      : null;
  return { container, codec, hasVideoTrack, durationMs };
}

function readVint(buf: Buffer, offset: number): { value: number; next: number } | null {
  if (offset >= buf.length) return null;
  const first = buf[offset];
  let width = 0;
  for (let i = 0; i < 8; i++) {
    if (first & (0x80 >> i)) {
      width = i + 1;
      break;
    }
  }
  if (!width || offset + width > buf.length) return null;
  let value = first & (0xff >> width);
  for (let i = 1; i < width; i++) value = (value << 8) | buf[offset + i];
  return { value, next: offset + width };
}

function readWebm(buf: Buffer): CountyStoryVideoProbe {
  let durationMs: number | null = null;
  let hasVideoTrack = false;
  let codec: string | null = null;
  let i = 0;
  while (i < buf.length - 3) {
    if (buf[i] === 0x44 && buf[i + 1] === 0x89) {
      const size = readVint(buf, i + 2);
      if (size && size.value === 8 && size.next + 8 <= buf.length) {
        durationMs = Math.round(buf.readDoubleBE(size.next));
      }
    }
    if (buf[i] === 0x86) {
      const size = readVint(buf, i + 1);
      if (size && size.value > 0 && size.next + size.value <= buf.length) {
        const name = buf.toString("ascii", size.next, size.next + size.value).toLowerCase();
        if (name.includes("v_mpeg4/iso/avc")) codec = "avc1";
        if (name.includes("v_mpegh/iso/hevc")) codec = "hvc1";
        if (name.includes("v_vp8")) codec = "vp08";
        if (name.includes("v_vp9")) codec = "vp09";
        if (name.includes("v_av1")) codec = "av01";
        if (name.startsWith("v_")) hasVideoTrack = true;
      }
    }
    i += 1;
  }
  return { container: "webm", codec, hasVideoTrack, durationMs };
}

export function probeCountyStoryVideo(buf: Buffer): CountyStoryVideoProbe {
  if (looksWebm(buf)) return readWebm(buf);
  if (ftypBrand(buf)) return readMp4(buf);
  return {
    container: "unknown",
    codec: null,
    hasVideoTrack: false,
    durationMs: null,
  };
}

export function validateCountyStoryVideo(
  buf: Buffer,
  opts?: { declaredType?: string | null; byteSize?: number | null },
): CountyStoryValidateOk | CountyStoryValidateFail {
  const size = opts?.byteSize ?? buf.length;
  if (size > COUNTY_STORY_MEDIA_MAX_BYTES || buf.length > COUNTY_STORY_MEDIA_MAX_BYTES) {
    return fail("FILE_TOO_LARGE", `File exceeds ${COUNTY_STORY_MEDIA_MAX_BYTES} bytes`);
  }
  if (buf.length < 12) {
    return fail("INVALID_MEDIA", "File is too small to be a video");
  }
  if (looksJpeg(buf) || looksPng(buf) || looksGif(buf) || looksWebp(buf)) {
    return fail("INVALID_MEDIA_TYPE", "County Stories accepts video only");
  }
  const declared = opts?.declaredType ?? "";
  if (
    declared &&
    declared !== "video/mp4" &&
    declared !== "video/quicktime" &&
    declared !== "video/webm"
  ) {
    return fail("INVALID_MEDIA_TYPE", "Declared type is not a supported video");
  }
  if (!ftypBrand(buf) && !looksWebm(buf)) {
    return fail("INVALID_MEDIA_TYPE", "File is not a supported video container");
  }
  const probe = probeCountyStoryVideo(buf);
  if (!probe.hasVideoTrack) {
    return fail("INVALID_MEDIA", "No video track found", probe);
  }
  if (probe.durationMs == null || probe.durationMs <= 0) {
    return fail("INVALID_MEDIA", "Duration could not be read from the file", probe);
  }
  if (probe.durationMs > COUNTY_STORY_MEDIA_MAX_DURATION_MS) {
    return fail("VIDEO_TOO_LONG", "Video exceeds 30 seconds", probe);
  }
  if (!probe.codec || !CODEC_OK.has(probe.codec)) {
    return fail("UNSUPPORTED_CODEC", "Codec is not approved for County Stories", probe);
  }
  return { ok: true, probe };
}
