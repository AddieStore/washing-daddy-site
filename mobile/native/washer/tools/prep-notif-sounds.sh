#!/usr/bin/env bash
# Makes the notification sounds (wav, mono) from the stage voice clips, so the OS can play them with the app closed.
# Run from mobile/native/washer after the clips exist:  tools/prep-notif-sounds.sh
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p assets/notif
for pair in 3:ph_dry 6:ph_polish 9:ph_check 10:ph_photo; do
  m=${pair%%:*}; clip=${pair##*:}
  [ -f assets/sound/voice/$clip.mp3 ] || { echo "missing assets/sound/voice/$clip.mp3"; exit 1; }
  ffmpeg -v error -y -i assets/sound/voice/$clip.mp3 -ar 44100 -ac 1 assets/notif/wd_s$m.wav
  echo "wd_s$m.wav"
done
