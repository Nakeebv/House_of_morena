#!/usr/bin/env bash
#
# Patch the OpenNext build output for Next.js 16.4's new `preview-props.json`.
#
# OpenNext inlines a whitelist of manifests into `loadManifest`; the file name
# `preview-props.json` does not match its `*-manifest.json` glob, so Next 16.4
# servers crash on every request with
#   Error: Unexpected loadManifest(/.next/server/preview-props.json) call!
# This script allows that manifest path (returning {} like Next.js does for the
# other optional manifests). Idempotent — safe to run after every build.
#
#   npx opennextjs-cloudflare build && ./scripts/patch-opennext.sh && npx wrangler deploy

set -euo pipefail
cd "$(dirname "$0")/.."

shopt -s nullglob
handlers=(.open-next/server-functions/*/handler.mjs .open-next/worker.js)

patched_any=false
for handler in "${handlers[@]}"; do
  [ -f "$handler" ] || continue
  if grep -q 'p.endsWith("preview-props")' "$handler" 2>/dev/null; then
    echo "    $handler already patched."
    continue
  fi
  if ! grep -q 'p.endsWith("prefetch-hints")' "$handler"; then
    echo "    $handler: no manifest guard found — nothing to do."
    continue
  fi
  # Append preview-props to the known-optional manifest list.
  python3 - "$handler" <<'PY'
import sys

path = sys.argv[1]
src = open(path, encoding="utf-8").read()
src = src.replace(
    'p.endsWith("prefetch-hints")',
    'p.endsWith("prefetch-hints")||p.endsWith("preview-props")',
)
open(path, "w", encoding="utf-8").write(src)
PY
  echo "    $handler patched (preview-props allowed)."
  patched_any=true
done

if [ "$patched_any" = false ]; then
  echo "    No handler needed patching."
fi
