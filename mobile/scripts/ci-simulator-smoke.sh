#!/usr/bin/env bash
# Simulator smoke test for the iOS shell. Runs on a macOS CI runner after a simulator build.
#   1. Live site: launch the app as built and screenshot it.
#   2. User agent: point a copy at a local server and check the request carries StoryHomeApp/1.
#   3. Offline: stop that server, relaunch, and check the bundled offline screen shows.
# Usage: ci-simulator-smoke.sh /path/to/App.app /path/to/output-dir
set -euo pipefail

APP="$1"
OUT="$2"
mkdir -p "$OUT"
BUNDLE_ID="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$APP/Info.plist")"
PORT=8787

DEVICE="$(xcrun simctl list devices available -j | python3 -c '
import json, sys
devices = json.load(sys.stdin)["devices"]
for runtime in sorted(devices, reverse=True):
    if "iOS" not in runtime:
        continue
    for d in devices[runtime]:
        if d["name"].startswith("iPhone") and "Pro" in d["name"]:
            print(d["udid"]); sys.exit()
for runtime in sorted(devices, reverse=True):
    for d in devices[runtime]:
        if "iOS" in runtime and d["name"].startswith("iPhone"):
            print(d["udid"]); sys.exit()
')"
echo "Simulator: $DEVICE"
xcrun simctl boot "$DEVICE" || true
xcrun simctl bootstatus "$DEVICE" -b

install_and_launch() {
  local app="$1" name="$2" wait="$3"
  xcrun simctl terminate "$DEVICE" "$BUNDLE_ID" >/dev/null 2>&1 || true
  xcrun simctl uninstall "$DEVICE" "$BUNDLE_ID" >/dev/null 2>&1 || true
  xcrun simctl install "$DEVICE" "$app"
  SIMCTL_CHILD_NSUnbufferedIO=YES xcrun simctl launch --terminate-running-process \
    --stdout="$OUT/$name-stdout.log" --stderr="$OUT/$name-stderr.log" \
    "$DEVICE" "$BUNDLE_ID"
  sleep "$wait"
  xcrun simctl io "$DEVICE" screenshot "$OUT/$name.png"
}

patched_copy() {
  local url="$1" dest="$2"
  rm -rf "$dest"
  cp -R "$APP" "$dest"
  python3 - "$dest/capacitor.config.json" "$url" <<'PY'
import json, sys
path, url = sys.argv[1], sys.argv[2]
config = json.load(open(path))
config["server"]["url"] = url
config["server"]["cleartext"] = True
json.dump(config, open(path, "w"), indent=2)
PY
  /usr/libexec/PlistBuddy -c "Add :NSAppTransportSecurity dict" "$dest/Info.plist"
  /usr/libexec/PlistBuddy -c "Add :NSAppTransportSecurity:NSAllowsLocalNetworking bool true" "$dest/Info.plist"
  codesign --force --deep --sign - --timestamp=none "$dest"
}

python3 -m venv "$OUT/.venv" >/dev/null
"$OUT/.venv/bin/pip" install --quiet "pillow==11.3.0"

# Prints the share of near-background pixels and gold pixels in a screenshot.
screen_stats() {
  "$OUT/.venv/bin/python" - "$1" <<'PY'
import sys
from PIL import Image
image = Image.open(sys.argv[1]).convert("RGB").resize((200, 400))
pixels = list(image.getdata())
background = sum(1 for r, g, b in pixels if r < 30 and g < 32 and b < 36) / len(pixels)
gold = sum(1 for r, g, b in pixels if r > 220 and 160 < g < 205 and b < 70) / len(pixels)
print(f"{background:.3f} {gold:.3f}")
PY
}

fail=0

echo "== 1. Live site"
codesign --force --deep --sign - --timestamp=none "$APP"
install_and_launch "$APP" "live-site" 30
read -r bg gold <<<"$(screen_stats "$OUT/live-site.png")"
echo "live-site.png: background share $bg, gold share $gold"
grep -h "WebView" "$OUT/live-site-stdout.log" || true
if python3 -c "import sys; sys.exit(0 if float('$bg') < 0.5 else 1)"; then
  echo "Live site rendered (not a blank or offline screen)."
else
  echo "::error::Live site screenshot looks blank or offline."
  fail=1
fi

echo "== 2. User agent marker"
cat > "$OUT/ua-server.py" <<'PY'
import http.server, sys
log = open(sys.argv[1], "a", buffering=1)
class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        log.write(self.headers.get("User-Agent", "") + "\n")
        body = b"<!doctype html><meta name=viewport content='width=device-width'><body style='background:#0b0d11;color:#f4f1e8;font:20px -apple-system'><h1>Shell smoke page</h1>"
        self.send_response(200)
        self.send_header("Content-Type", "text/html")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)
    def log_message(self, *args):
        pass
http.server.HTTPServer(("127.0.0.1", int(sys.argv[2])), Handler).serve_forever()
PY
: > "$OUT/user-agents.log"
python3 "$OUT/ua-server.py" "$OUT/user-agents.log" "$PORT" &
SERVER_PID=$!
sleep 1
patched_copy "http://127.0.0.1:$PORT" "$OUT/App-local.app"
install_and_launch "$OUT/App-local.app" "user-agent" 15
cat "$OUT/user-agents.log"
if grep -q "StoryHomeApp/1" "$OUT/user-agents.log"; then
  echo "User agent carries StoryHomeApp/1."
else
  echo "::error::User agent marker StoryHomeApp/1 not seen."
  fail=1
fi

echo "== 3. Offline screen"
kill "$SERVER_PID"
wait "$SERVER_PID" 2>/dev/null || true
install_and_launch "$OUT/App-local.app" "offline" 15
read -r bg gold <<<"$(screen_stats "$OUT/offline.png")"
echo "offline.png: background share $bg, gold share $gold"
grep -h "WebView" "$OUT/offline-stdout.log" || true
if python3 -c "import sys; sys.exit(0 if float('$bg') > 0.8 and float('$gold') > 0.003 else 1)"; then
  echo "Bundled offline screen is showing."
else
  echo "::error::Offline screen not detected with the server stopped."
  fail=1
fi

rm -rf "$OUT/App-local.app" "$OUT/.venv"
exit "$fail"
