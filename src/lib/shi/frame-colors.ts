export const SHI_FRAME_COLORS = [
  "#17335e",
  "#C45C26",
  "#2F6F5E",
  "#3B6EA5",
  "#8B6914",
  "#123F38",
  "#7A1F3D",
  "#4A5568",
] as const;

export function nextFrameColor(index: number): string {
  return SHI_FRAME_COLORS[index % SHI_FRAME_COLORS.length]!;
}
