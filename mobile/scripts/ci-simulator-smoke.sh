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
  xcrun simctl launch --terminate-running-process \
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

fail=0

echo "== 1. Live site"
codesign --force --deep --sign - --timestamp=none "$APP"
install_and_launch "$APP" "live-site" 30
if grep -q "WebView loaded" "$OUT/live-site-stdout.log" "$OUT/live-site-stderr.log"; then
  echo "Live site loaded."
else
  echo "::error::Live site did not report WebView loaded."
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
if grep -q "WebView failed provisional navigation" "$OUT/offline-stdout.log" "$OUT/offline-stderr.log"; then
  echo "Load failed as expected; see offline.png for the bundled screen."
else
  echo "::error::Expected a failed load with the server stopped."
  fail=1
fi

rm -rf "$OUT/App-local.app"
exit "$fail"
