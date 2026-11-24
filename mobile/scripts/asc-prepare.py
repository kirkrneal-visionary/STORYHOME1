"""Before a TestFlight upload: register the bundle ID and confirm the App Store Connect app record.

The App Store Connect API can register bundle IDs but cannot create app records, so a
missing record stops the run with plain instructions instead of a failed upload.

Env: ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_PATH. Arg: path to the synced capacitor.config.json.
"""

import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

import jwt

API = "https://api.appstoreconnect.apple.com/v1"


def token() -> str:
    with open(os.environ["ASC_KEY_PATH"], "rb") as handle:
        key = handle.read()
    now = int(time.time())
    return jwt.encode(
        {"iss": os.environ["ASC_ISSUER_ID"], "iat": now, "exp": now + 600, "aud": "appstoreconnect-v1"},
        key,
        algorithm="ES256",
        headers={"kid": os.environ["ASC_KEY_ID"], "typ": "JWT"},
    )


def call(method: str, path: str, body: dict | None = None) -> dict:
    request = urllib.request.Request(
        API + path,
        method=method,
        data=json.dumps(body).encode() if body else None,
        headers={"Authorization": f"Bearer {token()}", "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(request) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        detail = error.read().decode(errors="replace")
        raise SystemExit(f"App Store Connect {method} {path} failed ({error.code}): {detail}")


def main() -> None:
    config = json.load(open(sys.argv[1]))
    bundle_id = config["appId"]
    name = config.get("appName", "Story Home")

    query = urllib.parse.urlencode({"filter[identifier]": bundle_id, "filter[platform]": "IOS"})
    found = [row for row in call("GET", f"/bundleIds?{query}")["data"] if row["attributes"]["identifier"] == bundle_id]
    if found:
        print(f"Bundle ID {bundle_id} is registered.")
    else:
        call("POST", "/bundleIds", {
            "data": {"type": "bundleIds", "attributes": {"identifier": bundle_id, "name": name, "platform": "IOS"}}
        })
        print(f"Registered bundle ID {bundle_id}.")

    apps = call("GET", "/apps?" + urllib.parse.urlencode({"filter[bundleId]": bundle_id}))["data"]
    if not apps:
        print(
            f"::error::No App Store Connect app record uses {bundle_id} yet. "
            "Create it once in App Store Connect (Apps > + > New App, pick this bundle ID), then run this workflow again."
        )
        raise SystemExit(2)
    print(f"App record found: {apps[0]['attributes'].get('name')} ({apps[0]['id']}).")


if __name__ == "__main__":
    main()
