#!/bin/sh
# Usage: ./deploy/switch.sh new|old|status
# Chooses which site washingdaddy.com/ serves. Needs the Caddy snippet in place.
flag="$(dirname "$0")/../.use-new"
case "$1" in
  new) touch "$flag"; echo "Root now serves the NEW site (/new/). Classic is at /classic." ;;
  old) rm -f "$flag"; echo "Root now serves the CLASSIC site. New is at /new/." ;;
  status) [ -e "$flag" ] && echo "root = NEW" || echo "root = CLASSIC" ;;
  *) echo "usage: $0 new|old|status"; exit 1 ;;
esac
