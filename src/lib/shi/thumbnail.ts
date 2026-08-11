import { SHI_CAPS } from "@/lib/shi/caps";

/**
 * Shrink a JPEG/PNG data URL until under the Study Vault byte cap.
 * Browser-only (uses canvas). Returns original if already small / unavailable.
 */
export async function fitThumbnailDataUrl(
  dataUrl: string,
  maxBytes = SHI_CAPS.maxThumbnailBytes,
): Promise<string> {
  if (!dataUrl.startsWith("data:image")) return dataUrl;
  const approxBytes = Math.ceil(((dataUrl.length - dataUrl.indexOf(",")) * 3) / 4);
  if (approxBytes <= maxBytes) return dataUrl;

  if (typeof document === "undefined") return dataUrl;

  const img = await loadImage(dataUrl);
  let scale = Math.sqrt(maxBytes / Math.max(approxBytes, 1));
  scale = Math.min(0.92, Math.max(0.35, scale));

  for (let attempt = 0; attempt < 6; attempt++) {
    const w = Math.max(320, Math.round(img.width * scale));
    const h = Math.max(200, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return dataUrl;
    ctx.drawImage(img, 0, 0, w, h);
    const quality = Math.max(0.45, 0.82 - attempt * 0.07);
    const out = canvas.toDataURL("image/jpeg", quality);
    const outBytes = Math.ceil(((out.length - out.indexOf(",")) * 3) / 4);
    if (outBytes <= maxBytes) return out;
    scale *= 0.78;
  }
  return dataUrl;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read map snapshot"));
    img.src = src;
  });
}
