#!/bin/bash
# Sign a CI-built Play bundle (.aab) with the Washing Daddy upload key, on Ravi's Mac.
#
#   export WD_KS_PASSWORD="$(grep '^password=' ~/Downloads/signing.properties | cut -d= -f2-)"
#   bash sign-aab.sh <branch> <washer|customer>
#
# Downloads the unsigned bundle CI committed on <branch>, removes Expo's debug signature
# (Play rejects a bundle with two certificate chains), signs it and checks the result.
# Output: ~/Documents/wd-signing/<app>-signed.aab
set -euo pipefail

BRANCH="${1:?branch name, e.g. claude/project-thread-wwfrg1}"
APP="${2:-washer}"
: "${WD_KS_PASSWORD:?set WD_KS_PASSWORD first (see top of this file)}"

KS="$HOME/Library/Mobile Documents/com~apple~CloudDocs/washing-daddy-release.p12"
ALIAS=washingdaddy
DIR="$HOME/Documents/wd-signing"
mkdir -p "$DIR"
cd "$DIR"

if [ "$APP" = washer ]; then NAME=wd-partner; else NAME=customer; fi
RAW="https://raw.githubusercontent.com/AddieStore/washing-daddy-site/$BRANCH/mobile/native/$APP/out/$NAME-unsigned.aab"

echo "Downloading $NAME bundle from $BRANCH ..."
if curl -fsSL -o "$NAME-unsigned.aab" "$RAW"; then :
else
  curl -fsSL -o "$NAME-unsigned.aab.gz" "$RAW.gz"
  gunzip -f "$NAME-unsigned.aab.gz"
fi

echo "Removing the debug signature ..."
python3 - "$NAME-unsigned.aab" "$NAME-stripped.aab" <<'PY'
import sys, zipfile
src, dst = sys.argv[1], sys.argv[2]
with zipfile.ZipFile(src) as zi, zipfile.ZipFile(dst, 'w', zipfile.ZIP_DEFLATED) as zo:
    for item in zi.infolist():
        n = item.filename.upper()
        if n.startswith('META-INF/') and (n.endswith('.SF') or n.endswith('.RSA') or n.endswith('.DSA') or n.endswith('.EC') or n == 'META-INF/MANIFEST.MF'):
            continue
        zo.writestr(item, zi.read(item.filename))
PY

echo "Signing ..."
jarsigner -keystore "$KS" -storetype PKCS12 -storepass:env WD_KS_PASSWORD \
  -sigalg SHA256withRSA -digestalg SHA-256 \
  -signedjar "$NAME-signed.aab" "$NAME-stripped.aab" "$ALIAS" >/dev/null
jarsigner -verify "$NAME-signed.aab" | tail -1
rm -f "$NAME-stripped.aab"
ls -l "$DIR/$NAME-signed.aab"
echo "Signed. Serving it to the Play Console tab on http://127.0.0.1:8765/$NAME-signed.aab"
echo "Leave this window open until Claude says the upload is done, then press Ctrl+C."
exec python3 - <<'PY'
import http.server, functools, os
class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Private-Network', 'true')
        super().end_headers()
    def do_OPTIONS(self):
        self.send_response(204); self.end_headers()
http.server.ThreadingHTTPServer(('127.0.0.1', 8765), functools.partial(H, directory=os.getcwd())).serve_forever()
PY
