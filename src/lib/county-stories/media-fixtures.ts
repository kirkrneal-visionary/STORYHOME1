/** Isolated MP4/WebM builders for Wave 2 validation tests. Not production media. */

function box(type: string, payload: Buffer): Buffer {
  const out = Buffer.alloc(8 + payload.length);
  out.writeUInt32BE(8 + payload.length, 0);
  out.write(type, 4, 4, "ascii");
  payload.copy(out, 8);
  return out;
}

function concat(...parts: Buffer[]): Buffer {
  return Buffer.concat(parts);
}

function ascii(value: string): Buffer {
  return Buffer.from(value, "ascii");
}

function u32(value: number): Buffer {
  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(value >>> 0, 0);
  return buf;
}

function mvhd(timescale: number, duration: number): Buffer {
  const payload = Buffer.alloc(100);
  payload.writeUInt32BE(timescale, 12);
  payload.writeUInt32BE(duration, 16);
  payload.writeUInt32BE(0x00010000, 20);
  payload.writeUInt16BE(0x0100, 24);
  payload.writeUInt32BE(0x00010000, 36);
  payload.writeUInt32BE(0x00010000, 52);
  payload.writeUInt32BE(0x40000000, 68);
  payload.writeUInt32BE(2, 96);
  return box("mvhd", payload);
}

function hdlr(handler: string): Buffer {
  const name = Buffer.from("VideoHandler\u0000", "ascii");
  const payload = Buffer.alloc(24 + name.length);
  payload.write(handler, 8, 4, "ascii");
  name.copy(payload, 24);
  return box("hdlr", payload);
}

function stsd(codec: string): Buffer {
  const entry = Buffer.alloc(86);
  entry.writeUInt32BE(86, 0);
  entry.write(codec, 4, 4, "ascii");
  entry.writeUInt16BE(1, 14);
  entry.writeUInt16BE(1920, 32);
  entry.writeUInt16BE(1080, 34);
  entry.writeUInt32BE(0x00480000, 36);
  entry.writeUInt32BE(0x00480000, 40);
  entry.writeUInt16BE(1, 48);
  const payload = concat(Buffer.alloc(4), u32(1), entry);
  return box("stsd", payload);
}

export function buildCountyStoryMp4(opts: {
  durationMs: number;
  timescale?: number;
  codec?: string;
  videoTrack?: boolean;
  brand?: "isom" | "qt  ";
}): Buffer {
  const timescale = opts.timescale ?? 1000;
  const duration = Math.round(((opts.durationMs ?? 0) * timescale) / 1000);
  const codec = opts.codec ?? "avc1";
  const brand = opts.brand ?? "isom";
  const ftyp = box(
    "ftyp",
    concat(
      ascii(brand),
      u32(0),
      ascii(brand),
      ascii(brand === "qt  " ? "qt  " : "iso2"),
      ascii(brand === "qt  " ? "qt  " : "avc1"),
      ascii(brand === "qt  " ? "qt  " : "mp41"),
    ),
  );
  const mdia = box(
    "mdia",
    concat(
      box("mdhd", Buffer.alloc(32)),
      hdlr(opts.videoTrack === false ? "soun" : "vide"),
      box("minf", concat(box("vmhd", Buffer.alloc(12)), box("stbl", stsd(codec)))),
    ),
  );
  const trak = box("trak", concat(box("tkhd", Buffer.alloc(84)), mdia));
  const moov = box("moov", concat(mvhd(timescale, duration), trak));
  const mdat = box("mdat", Buffer.from([0, 0, 0, 1, 0x67]));
  return concat(ftyp, moov, mdat);
}

export function buildCountyStoryWebm(opts: {
  durationMs: number;
  codecId?: string;
}): Buffer {
  const header = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x01, 0x00, 0x00, 0x00]);
  const duration = Buffer.alloc(11);
  duration[0] = 0x44;
  duration[1] = 0x89;
  duration[2] = 0x88;
  duration.writeDoubleBE(opts.durationMs, 3);
  const codecName = Buffer.from(opts.codecId ?? "V_MPEG4/ISO/AVC", "ascii");
  const codec = Buffer.alloc(2 + codecName.length);
  codec[0] = 0x86;
  codec[1] = 0x80 | codecName.length;
  codecName.copy(codec, 2);
  return Buffer.concat([header, duration, codec, Buffer.alloc(32, 1)]);
}

export function jpegBytes(): Buffer {
  return Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
}

export function gifBytes(): Buffer {
  return Buffer.from("GIF89a........", "ascii");
}
