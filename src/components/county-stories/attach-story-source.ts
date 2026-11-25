"use client";

export type DetachStorySource = () => void;

/**
 * Plays signed Mux HLS. Browsers with built-in HLS (iPhone, Safari, current Chrome) use it;
 * others load hls.js on demand so the homepage never ships it.
 */
export async function attachStorySource(
  video: HTMLVideoElement,
  url: string,
  onFatal: () => void,
): Promise<DetachStorySource> {
  const detachNative = () => {
    video.removeAttribute("src");
    video.load();
  };
  if (video.canPlayType("application/vnd.apple.mpegurl")) {
    video.src = url;
    return detachNative;
  }
  const { default: Hls } = await import("hls.js/light");
  if (!Hls.isSupported()) {
    video.src = url;
    return detachNative;
  }
  const hls = new Hls({ capLevelToPlayerSize: true, maxBufferLength: 30 });
  hls.on(Hls.Events.ERROR, (_event, data) => {
    if (data.fatal) onFatal();
  });
  hls.loadSource(url);
  hls.attachMedia(video);
  return () => hls.destroy();
}
