/** Production security headers. CSP lists services we actually use. */

export const STORY_SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "SAMEORIGIN",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(self)",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "Content-Security-Policy": [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.mapbox.com https://events.mapbox.com https://*.arcgisonline.com https://*.usgs.gov https://*.arcgis.com https://tnris-data.s3.amazonaws.com https://*.s3.amazonaws.com https://server.arcgisonline.com https://services.arcgisonline.com https://tiles.openfreemap.org https://unpkg.com",
    "worker-src 'self' blob:",
    "child-src 'self' blob:",
  ].join("; "),
};
