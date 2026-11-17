#!/usr/bin/env bash
# Makes the notification sounds (wav, mono) from the voice clips, so the OS can play them with the app closed:
# one file per clip, wd_c_<clip>.wav (src/lib/washAlerts.ts uses one channel per clip). Run from mobile/native/washer
# after the clips exist:  tools/prep-notif-sounds.sh
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p assets/notif
rm -f assets/notif/wd_c_*.wav assets/notif/wd_s*.wav assets/notif/wd_u*.wav
mk() { # clip [buzz]: clip alone, or the buzzer first
  local clip=$1 pre=${2:-}
  [ -f assets/sound/voice/$clip.mp3 ] || { echo "skip $clip (no clip yet)"; return 0; }
  if [ -n "$pre" ]; then
    ffmpeg -v error -y -i assets/sound/voice/buzz.mp3 -i assets/sound/voice/$clip.mp3 -filter_complex '[0:a][1:a]concat=n=2:v=0:a=1' -ar 44100 -ac 1 assets/notif/wd_c_$clip.wav
  else
    ffmpeg -v error -y -i assets/sound/voice/$clip.mp3 -ar 44100 -ac 1 assets/notif/wd_c_$clip.wav
  fi
  echo "wd_c_$clip.wav"
}
# stage voices (must match src/lib/washGuide.ts): plain
for c in ph_dry ph_polish ph_check ph_photo ph_photo_sun ph_i_dash ph_i_seat ph_i_back ph_i_mat ph_i_glass ph_late; do mk $c; done
# with the buzzer first: the time-up line and the 5:00 alarm
for c in ph_end ph_morning; do mk $c buzz; done
# the 'extra kaam' push sound (channel wd_extra_v1) is the intro voice clip
ffmpeg -v error -y -i assets/sound/voice/intro.mp3 -ar 44100 -ac 1 assets/notif/wd_extra.wav
echo "wd_extra.wav"
