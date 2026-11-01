#!/usr/bin/env bash
# Makes the notification sounds (wav, mono) from the stage voice clips, so the OS can play them with the app closed.
# Run from mobile/native/washer after the clips exist:  tools/prep-notif-sounds.sh
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p assets/notif
# prefix:minute:clip  (s = Mon-Sat plan, u = Sunday plan; must match src/lib/washGuide.ts)
for pair in s3:ph_dry s6:ph_polish s9:ph_check s10:ph_photo u3:ph_dry u6:ph_int u10:ph_polish u13:ph_check u14:ph_photo_sun; do
  m=${pair%%:*}; clip=${pair##*:}
  [ -f assets/sound/voice/$clip.mp3 ] || { echo "missing assets/sound/voice/$clip.mp3"; exit 1; }
  ffmpeg -v error -y -i assets/sound/voice/$clip.mp3 -ar 44100 -ac 1 assets/notif/wd_$m.wav
  echo "wd_$m.wav"
done
# the 'extra kaam' push sound (channel wd_extra_v1) is the intro voice clip
[ -f assets/sound/voice/intro.mp3 ] || { echo "missing assets/sound/voice/intro.mp3"; exit 1; }
ffmpeg -v error -y -i assets/sound/voice/intro.mp3 -ar 44100 -ac 1 assets/notif/wd_extra.wav
echo "wd_extra.wav"
