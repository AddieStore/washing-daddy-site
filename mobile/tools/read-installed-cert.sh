#!/bin/bash
# Reads the certificate of the WD Partner app installed on your phone (via USB) and prints SHA-1 / SHA-256.
set -e
ADB=$(command -v adb || echo "$HOME/Library/Android/sdk/platform-tools/adb")
APKSIGNER=$(ls "$HOME"/Library/Android/sdk/build-tools/*/apksigner | tail -1)
mkdir -p ~/Documents/wd-signing/installed && cd ~/Documents/wd-signing/installed
"$ADB" devices
P=$("$ADB" shell pm path com.washingdaddy.washer | head -1 | cut -d: -f2 | tr -d '\r')
echo "Installed base APK: $P"
"$ADB" pull "$P" base.apk >/dev/null
"$APKSIGNER" verify --print-certs base.apk | grep -E "certificate (SHA-1|SHA-256) digest"
