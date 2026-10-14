#!/usr/bin/env bash
#
# Push the Morena Collection repo to GitHub.
#
#   ./scripts/push-to-github.sh git@github.com:your-name/morena-collection.git
#   ./scripts/push-to-github.sh https://github.com/your-name/morena-collection.git
#
# If you prefer not to pass the URL every time, set MORENA_GIT_REMOTE in your
# shell profile or in a local .env.local file.

set -euo pipefail

cd "$(dirname "$0")/.."

REMOTE="${1:-${MORENA_GIT_REMOTE:-}}"

if [ -z "$REMOTE" ]; then
  echo "Usage: ./scripts/push-to-github.sh <git-remote-url>"
  echo ""
  echo "Create the repository on github.com first (no README, no .gitignore),"
  echo "then pass its URL here."
  exit 1
fi

# Refuse to push if a real secret is staged.
if git status --porcelain | grep -qE '(^|/)\.env$|\.env\.local$'; then
  echo "Refusing to push: an untracked .env file is present."
  echo "It is gitignored, so it will not be committed — but double-check before pushing."
fi

if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$REMOTE"
else
  git remote add origin "$REMOTE"
fi

git add -A
git commit -m "Update Morena Collection" >/dev/null 2>&1 || true

git push -u origin main

echo ""
echo "Pushed to $REMOTE"
echo "Branch: main"
