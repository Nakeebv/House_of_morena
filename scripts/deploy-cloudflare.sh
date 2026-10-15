#!/usr/bin/env bash
#
# Deploy House of Morena to Cloudflare, from this terminal.
#
#   ./scripts/deploy-cloudflare.sh
#
# Two ways to authenticate — either works:
#
#   1. An API token (no browser needed):
#        export CLOUDFLARE_API_TOKEN="your-token"
#      Create one at dash.cloudflare.com → My Profile → API Tokens →
#      Create Token → "Edit Cloudflare Workers" template.
#
#   2. Browser login: run `npx wrangler login` first.
#
# Supply the database one of these ways (it will ask otherwise):
#        export DATABASE_URL="postgres://..."
#        ./scripts/deploy-cloudflare.sh
#
# Everything else is optional:
#        ADMIN_PASSWORD, SELLER_EMAIL, RESEND_API_KEY, EMAIL_FROM, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET

set -euo pipefail
cd "$(dirname "$0")/.."

BOLD=$'\033[1m'; DIM=$'\033[2m'; RESET=$'\033[0m'
step() { printf "\n%s==> %s%s\n" "$BOLD" "$1" "$RESET"; }
note() { printf "    %s%s%s\n" "$DIM" "$1" "$RESET"; }

echo "${BOLD}House of Morena — Cloudflare deployment${RESET}"

# --------------------------------------------------------------- 1. auth ---
step "Checking Cloudflare authentication"

# wrangler whoami exits 0 even when unauthenticated, so inspect its output.
authenticated() {
  local output
  output="$(npx wrangler whoami 2>&1 || true)"
  if printf '%s' "$output" | grep -qi "not authenticated"; then
    return 1
  fi
  # An account table row means we are signed in.
  printf '%s' "$output" | grep -qi "account name"
}

if [ -n "${CLOUDFLARE_API_TOKEN:-}" ]; then
  note "Using CLOUDFLARE_API_TOKEN from the environment."
else
  if ! authenticated; then
    cat <<'MSG'

    Not authenticated. Pick one:

      A) Create an API token and export it, then re-run this script:
           dash.cloudflare.com → My Profile → API Tokens → Create Token
           → use the "Edit Cloudflare Workers" template

           export CLOUDFLARE_API_TOKEN="your-token"
           ./scripts/deploy-cloudflare.sh

      B) Or log in with a browser (opens a link):
           npx wrangler login

MSG
    exit 1
  fi
fi
npx wrangler whoami | grep -v "^$" | tail -4 || true

# ------------------------------------------------------------ 2. prepare ---
step "Preparing the Cloudflare build"
./scripts/prepare-cloudflare.sh

# ---------------------------------------------------------- 3. database ---
step "Database"

if [ -z "${DATABASE_URL:-}" ]; then
  read -r -p "    Postgres connection string (Neon, Supabase, RDS or your own): " DATABASE_URL
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "    A database is required. Nothing has been changed."
  exit 1
fi

note "Creating the tables…"
DATABASE_URL="$DATABASE_URL" npx drizzle-kit push --force

# ----------------------------------------------------------- 4. secrets ---
step "Uploading secrets"

put_secret() {
  if [ -n "${2:-}" ]; then
    printf "%s" "$2" | npx wrangler secret put "$1" >/dev/null
    note "$1 set."
  else
    note "$1 not supplied — skipping."
  fi
}

ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"
if [ -z "$ADMIN_PASSWORD" ]; then
  read -r -p "    Admin password for /admin (press enter to generate a strong one): " ADMIN_PASSWORD
  if [ -z "$ADMIN_PASSWORD" ]; then
    if command -v openssl >/dev/null 2>&1; then
      ADMIN_PASSWORD="$(openssl rand -base64 18 | tr -d '=/\+')" ;
    else
      ADMIN_PASSWORD="$(head -c 16 /dev/urandom | od -An -tx1 | tr -d ' \n')" ;
    fi
  fi
fi

if [ -z "${SELLER_EMAIL:-}" ]; then
  read -r -p "    Your email for order alerts (blank to skip): " SELLER_EMAIL || true
fi

echo "$DATABASE_URL"      | npx wrangler secret put DATABASE_URL >/dev/null
put_secret ADMIN_PASSWORD "$ADMIN_PASSWORD"
put_secret SELLER_EMAIL   "${SELLER_EMAIL:-}"
put_secret RESEND_API_KEY "${RESEND_API_KEY:-}"
put_secret EMAIL_FROM     "${EMAIL_FROM:-}"
put_secret CLOUDINARY_CLOUD_NAME "${CLOUDINARY_CLOUD_NAME:-}"
put_secret CLOUDINARY_API_KEY    "${CLOUDINARY_API_KEY:-}"
put_secret CLOUDINARY_API_SECRET "${CLOUDINARY_API_SECRET:-}"

# Generate a random session secret if one is not provided.
if [ -z "${ADMIN_SESSION_SECRET:-}" ]; then
  if command -v openssl >/dev/null 2>&1; then
    ADMIN_SESSION_SECRET="$(openssl rand -hex 32)"
  else
    ADMIN_SESSION_SECRET="$(head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n')"
  fi
fi
put_secret ADMIN_SESSION_SECRET "$ADMIN_SESSION_SECRET"

# ------------------------------------------------------------ 5. deploy ---
step "Building for Cloudflare"
npx opennextjs-cloudflare build

step "Patching the build for Next 16.4 (preview-props manifest)"
./scripts/patch-opennext.sh

step "Deploying"
npx wrangler deploy

# -------------------------------------------------------------- 6. done ---
ACCOUNT_HINT=$(npx wrangler whoami 2>/dev/null | grep -oE '[a-z0-9-]+\.[a-z]+\.workers\.dev' | head -1 || true)

echo
echo "${BOLD}Deployed.${RESET}"
echo "    Your site:   https://house-of-morena.${ACCOUNT_HINT:-<your-subdomain>.workers.dev}"
echo "    Admin panel: /admin"
echo
echo "    Custom domain:  Cloudflare dashboard → Workers & Pages →"
echo "                     house-of-morena → Settings → Domains & Routes"
echo
    echo "    Redeploy after changes:"
    echo "        npx opennextjs-cloudflare build && ./scripts/patch-opennext.sh && npx wrangler deploy"
