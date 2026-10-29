#!/usr/bin/env bash
# typo-kit Termux hook — clipboard-safe correction lane.
# Opt-in ONLY: TYPO_HOOK_ALLOW_CLIPBOARD=1 enables get/set; otherwise stdin/stdout.
set -euo pipefail
KIT=/home/toxic/pens/ranch/products/typo-kit
TEXT="${1:-}"
if [ -z "$TEXT" ] && [ "${TYPO_HOOK_ALLOW_CLIPBOARD:-0}" = "1" ]; then
  TEXT=$(termux-clipboard-get 2>/dev/null || true)
fi
if [ -z "$TEXT" ]; then
  TEXT=$(cat)
fi
OUT=$(bun "$KIT/bin/typo-shim.ts" --json --no-embed <<< "$TEXT" || bun "$KIT/bin/typo-shim.ts" --json <<< "$TEXT")
echo "$OUT" | python3 -c "
import json,sys
try:
    d=json.load(sys.stdin)
except Exception:
    sys.exit(0)
print(d.get('corrected',''))
if d.get('dangerous'): print('[denied] dangerous pattern; not writing clipboard', file=sys.stderr); sys.exit(3)
"
if [ "${TYPO_HOOK_ALLOW_CLIPBOARD:-0}" = "1" ] && [ -z "${1:-}" ]; then
  CORR=$(bun "$KIT/bin/typo-shim.ts" --no-embed <<< "$TEXT")
  command -v termux-clipboard-set >/dev/null && termux-clipboard-set "$CORR"
fi
