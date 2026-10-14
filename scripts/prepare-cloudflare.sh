#!/usr/bin/env bash
#
# Prepares this project for a Cloudflare Workers build.
#
# Run automatically by scripts/deploy-cloudflare.sh — you rarely need to call
# this yourself. Idempotent: safe to run any number of times.

set -euo pipefail
cd "$(dirname "$0")/.."

# ---------------------------------------------------------------------------
# pg-cloudflare exports patch
# ---------------------------------------------------------------------------
# pg's Cloudflare branch requires the pg-cloudflare socket adapter. That
# package's "exports" map points its "default" condition at an empty stub, so
# the dependency tracer only copies dist/empty.js — while esbuild, bundling
# under workerd conditions, needs dist/index.js and the build fails with
# "Could not resolve pg-cloudflare".
#
# Pointing every condition at the real entry makes the tracer copy the file the
# bundler actually needs.
node - <<'JS'
const fs = require("fs");
const path = "node_modules/pg-cloudflare/package.json";

if (!fs.existsSync(path)) {
  console.log("  pg-cloudflare not installed — nothing to patch.");
  process.exit(0);
}

const pkg = JSON.parse(fs.readFileSync(path, "utf8"));
const current = pkg.exports && pkg.exports["."] && pkg.exports["."].default;

if (current === "./dist/index.js") {
  console.log("  pg-cloudflare exports already patched.");
  process.exit(0);
}

pkg.exports["."] = { default: "./dist/index.js" };
fs.writeFileSync(path, JSON.stringify(pkg, null, 2) + "\n");
console.log("  Patched pg-cloudflare exports to the real entry point.");
JS

echo "  Cloudflare build prepared."
