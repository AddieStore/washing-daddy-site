#!/usr/bin/env bash
# Re-signs an APK with the Washing Daddy release key (v1+v2+v3) using Google's apksig library,
# verifies the result and prints the signer certificate SHA-256. No Android SDK needed, only a JDK 17+.
#
# Usage: tools/sign-apk.sh <in.apk> <out.apk> <keystore.p12> <alias> [password]
# The password may be given as the 5th argument or in $WD_KS_PASSWORD (preferred: it stays out of
# the process list). It is passed to Java through the environment and never written to disk.
#
# apksig is fetched once into ~/.cache/wd-apksig/ from Google Maven (maven.google.com), falling
# back to Ubuntu's libapksig-java package if dl.google.com is unreachable.
set -euo pipefail

if [ $# -lt 4 ]; then
  echo "usage: $0 <in.apk> <out.apk> <keystore.p12> <alias> [password]" >&2
  exit 2
fi
IN=$1; OUT=$2; KS=$3; ALIAS=$4
export WD_KS_PASSWORD=${5:-${WD_KS_PASSWORD:-}}
[ -n "$WD_KS_PASSWORD" ] || { echo "keystore password missing (5th arg or WD_KS_PASSWORD)" >&2; exit 2; }
[ -f "$IN" ] || { echo "input APK not found: $IN" >&2; exit 2; }
[ -f "$KS" ] || { echo "keystore not found: $KS" >&2; exit 2; }

HERE=$(cd "$(dirname "$0")" && pwd)
CACHE=${WD_APKSIG_CACHE:-$HOME/.cache/wd-apksig}
APKSIG_VERSION=${APKSIG_VERSION:-8.7.3}
JAR=$CACHE/apksig-$APKSIG_VERSION.jar
mkdir -p "$CACHE"

[ -s "$CACHE/apksig-ubuntu.jar" ] && [ ! -s "$JAR" ] && JAR=$CACHE/apksig-ubuntu.jar
if [ ! -s "$JAR" ]; then
  URL=https://maven.google.com/com/android/tools/build/apksig/$APKSIG_VERSION/apksig-$APKSIG_VERSION.jar
  echo "fetching apksig $APKSIG_VERSION ..." >&2
  if curl -fsSL --retry 2 -o "$JAR.part" "$URL" && unzip -tq "$JAR.part" >/dev/null 2>&1; then
    mv "$JAR.part" "$JAR"
  else
    rm -f "$JAR.part"
    echo "Google Maven unreachable, falling back to Ubuntu libapksig-java" >&2
    TMP=$(mktemp -d)
    trap 'rm -rf "$TMP"' EXIT
    (cd "$TMP" && apt-get download libapksig-java >/dev/null 2>&1 || { echo "could not download apksig" >&2; exit 1; }
     dpkg-deb -x libapksig-java_*.deb x)
    JAR=$CACHE/apksig-ubuntu.jar
    cp "$TMP"/x/usr/share/java/apksig-*.jar "$JAR"
  fi
fi

mkdir -p "$(dirname "$OUT")"
java -cp "$JAR" "$HERE/SignApk.java" "$IN" "$OUT" "$KS" "$ALIAS" 2> >(grep -v '^Picked up JAVA_TOOL_OPTIONS' >&2)
