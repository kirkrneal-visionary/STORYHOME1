/**
 * SW-7 — Soft stills when a listing has no usable photos.
 * Drawn locally so export never fails empty (no external fetch).
 */

export function createDemoListingStill(
  label: string,
  subtitle: string,
  width: number,
  height: number,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const g = ctx.createLinearGradient(0, 0, width, height);
  g.addColorStop(0, "#0f1f1c");
  g.addColorStop(0.55, "#1a3a34");
  g.addColorStop(1, "#123f38");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "rgba(245,183,30,0.08)";
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.arc(
      width * (0.12 + i * 0.14),
      height * (0.25 + (i % 3) * 0.18),
      70 + i * 18,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  ctx.fillStyle = "rgba(245,183,30,0.9)";
  ctx.font = `600 ${Math.round(width * 0.018)}px ui-monospace, monospace`;
  ctx.textAlign = "center";
  ctx.fillText("STORY WALK", width / 2, height * 0.42);

  ctx.fillStyle = "#f4f1ea";
  ctx.font = `700 ${Math.round(width * 0.04)}px Georgia, serif`;
  ctx.fillText(label.slice(0, 48), width / 2, height * 0.52);

  ctx.fillStyle = "rgba(244,241,234,0.65)";
  ctx.font = `400 ${Math.round(width * 0.02)}px system-ui, sans-serif`;
  ctx.fillText(subtitle.slice(0, 60), width / 2, height * 0.6);

  return canvas;
}

export function demoStillDataUrl(
  label: string,
  subtitle: string,
  width = 1920,
  height = 1080,
): string {
  return createDemoListingStill(label, subtitle, width, height).toDataURL(
    "image/jpeg",
    0.92,
  );
}
