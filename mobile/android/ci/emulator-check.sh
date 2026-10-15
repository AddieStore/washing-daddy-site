#!/usr/bin/env bash
# Runs inside the Android emulator job: installs both APKs, opens each, screenshots it,
# and fails if either app crashes on launch.
set -u
OUT=ci-screens; mkdir -p $OUT
adb wait-for-device
adb shell settings put global window_animation_scale 0
adb shell settings put global transition_animation_scale 0
adb shell settings put global animator_duration_scale 0
fail=0
for pair in "customer:com.washingdaddy.customer:washing-daddy-customer.apk" "washer:com.washingdaddy.washer:wd-washer.apk"; do
  IFS=: read name pkg apk <<< "$pair"
  echo "== $name"
  adb install -r "apks/$apk" || { echo "INSTALL FAILED $name"; fail=1; continue; }
  adb logcat -c
  adb shell am start -W -n "$pkg/com.washingdaddy.app.MainActivity"
  sleep 25
  adb exec-out screencap -p > "$OUT/$name-1-open.png"
  if [ -z "$(adb shell pidof $pkg)" ]; then echo "CRASHED $name"; fail=1; fi
  # tap the phone field and type a test login, so the screenshot shows the app reacting
  adb shell input keyevent KEYCODE_BACK >/dev/null 2>&1 || true
  adb shell am start -n "$pkg/com.washingdaddy.app.MainActivity" >/dev/null; sleep 3
  adb exec-out screencap -p > "$OUT/$name-2-reopen.png"
  adb logcat -d -s chromium:I AndroidRuntime:E | tail -n 80 > "$OUT/$name-logcat.txt"
  grep -E "FATAL|Uncaught" "$OUT/$name-logcat.txt" && fail=1
  adb shell dumpsys package "$pkg" | grep -E "versionName|targetSdk" > "$OUT/$name-package.txt"
done
exit $fail
