#!/usr/bin/env bash
# Makes the notification sounds (wav, mono) from the stage voice clips, so the OS can play them with the app closed.
# Run from mobile/native/washer after the clips exist:  tools/prep-notif-sounds.sh
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p assets/notif
# prefix:minute:clip  (s = Mon-Sat plan, u = Sunday plan; must match src/lib/washGuide.ts)
for pair in s3:ph_dry s6:ph_polish s9:ph_check s10:ph_photo u4:ph_dry u8:ph_polish u12:ph_i_dash u15:ph_i_seat u18:ph_i_back u20:ph_i_mat u22:ph_i_glass u24:ph_check u25:ph_photo_sun; do
  m=${pair%%:*}; clip=${pair##*:}
  [ -f assets/sound/voice/$clip.mp3 ] || { echo "missing assets/sound/voice/$clip.mp3"; exit 1; }
  ffmpeg -v error -y -i assets/sound/voice/$clip.mp3 -ar 44100 -ac 1 assets/notif/wd_$m.wav
  echo "wd_$m.wav"
done
# the 'extra kaam' push sound (channel wd_extra_v1) is the intro voice clip
[ -f assets/sound/voice/intro.mp3 ] || { echo "missing assets/sound/voice/intro.mp3"; exit 1; }
ffmpeg -v error -y -i assets/sound/voice/intro.mp3 -ar 44100 -ac 1 assets/notif/wd_extra.wav
echo "wd_extra.wav"
