/**
 * Server-only LiDAR tile restyle.
 * Contours arrive black-on-black from 3DEP — punch the void, keep the lines.
 */

import { PNG } from "pngjs";
import type { ResearchLidarProduct } from "@/lib/shi/research-lidar";

const LINE = { r: 92, g: 54, b: 24 };

export function styleResearchLidarTile(
  product: ResearchLidarProduct,
  body: Buffer,
): Buffer {
  if (product !== "contours") return body;
  try {
    const png = PNG.sync.read(body);
    const data = png.data;
    for (let i = 0; i < data.length; i += 4) {
      const lum = (data[i]! + data[i + 1]! + data[i + 2]!) / 3;
      // 3DEP contour presets draw near-black lines on black.
      if (lum < 1) {
        data[i + 3] = 0;
        continue;
      }
      data[i] = LINE.r;
      data[i + 1] = LINE.g;
      data[i + 2] = LINE.b;
      data[i + 3] = Math.min(230, 90 + lum);
    }
    return PNG.sync.write(png);
  } catch {
    return body;
  }
}
