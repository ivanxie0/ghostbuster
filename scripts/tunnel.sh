#!/usr/bin/env bash
# Expose the local backend (port 8000) on your fixed ngrok domain so ElevenLabs' post-call webhook can reach it.
# Reads NGROK_DOMAIN (and optional NGROK_AUTHTOKEN) from .env, keeps PUBLIC_BASE_URL in .env in sync,
# prints the webhook URL, then runs ngrok in the foreground (Ctrl+C to stop).
set -euo pipefail
cd "$(dirname "$0")/.."

envval() { grep -E "^$1=" .env 2>/dev/null | head -1 | cut -d= -f2- || true; }

command -v ngrok >/dev/null || { echo "ngrok not installed: brew install ngrok"; exit 1; }
DOMAIN="$(envval NGROK_DOMAIN)"
if [ -z "$DOMAIN" ]; then
  echo "NGROK_DOMAIN is empty in .env. Find yours at dashboard.ngrok.com -> Domains (e.g. name.ngrok-free.dev)."
  exit 1
fi
TOKEN="$(envval NGROK_AUTHTOKEN)"
[ -n "$TOKEN" ] && export NGROK_AUTHTOKEN="$TOKEN"   # otherwise ngrok uses its own config file

URL="https://${DOMAIN}"
python3 - "$URL" <<'PY'
import pathlib, re, sys
p = pathlib.Path(".env"); s = p.read_text()
line = f"PUBLIC_BASE_URL={sys.argv[1]}"
s = re.sub(r"(?m)^PUBLIC_BASE_URL=.*$", line, s) if re.search(r"(?m)^PUBLIC_BASE_URL=", s) else s + f"\n{line}\n"
p.write_text(s)
PY

echo "PUBLIC_BASE_URL=${URL}  (written to .env; restart the backend if it was already running)"
echo "ElevenLabs post-call webhook URL: ${URL}/api/webhooks/call-complete"
exec ngrok http --url="${URL}" 8000
