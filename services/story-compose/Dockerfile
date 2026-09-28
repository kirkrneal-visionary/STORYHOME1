# Private County Story composition. One execution joins one Story, then exits.
# FFmpeg is the engine. Mux remains the only playback provider.
FROM debian:bookworm-slim

# Debian bookworm's ffmpeg package is the pinned engine for this image.
# Rebuild the image to change FFmpeg. Do not float an unpinned latest tag.
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg ca-certificates nodejs \
  && rm -rf /var/lib/apt/lists/* \
  && ffmpeg -version | head -n 1 > /etc/storyhome-ffmpeg-version \
  && grep -q "ffmpeg version" /etc/storyhome-ffmpeg-version

WORKDIR /app
COPY compose.mjs /app/compose.mjs

LABEL org.storyhome.compose="county-story-ffmpeg"
ENV COUNTY_STORY_COMPOSE_TIMEOUT_SEC=180

ENTRYPOINT ["node", "/app/compose.mjs"]
