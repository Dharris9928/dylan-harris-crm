#!/usr/bin/env bash
set -euo pipefail

PROD_REPO="${PROD_REPO:-https://github.com/Dharris9928/nestpro-connector.git}"
PROD_BRANCH="${PROD_BRANCH:-main}"
DATE_TAG="$(date +%Y-%m-%d)"
SYNC_BRANCH="sync/from-prod-${DATE_TAG}"
EXCLUDE_FILE=".github/sync-exclude.txt"

echo "==> Configuring git identity"
git config user.name  "${GIT_USER_NAME:-sync-bot}"
git config user.email "${GIT_USER_EMAIL:-sync-bot@users.noreply.github.com}"

echo "==> Ensuring 'prod' remote -> ${PROD_REPO}"
if git remote get-url prod >/dev/null 2>&1; then
  git remote set-url prod "${PROD_REPO}"
else
  git remote add prod "${PROD_REPO}"
fi

echo "==> Fetching prod/${PROD_BRANCH}"
git fetch prod "${PROD_BRANCH}"

echo "==> Snapshotting demo's protected files"
TMP_PROTECT="$(mktemp -d)"
trap 'rm -rf "$TMP_PROTECT"' EXIT

while IFS= read -r path; do
  [[ -z "$path" || "$path" =~ ^# ]] && continue
  if [[ -e "$path" ]]; then
    mkdir -p "$TMP_PROTECT/$(dirname "$path")"
    cp -R "$path" "$TMP_PROTECT/$path"
    echo "   protected: $path"
  fi
done < "$EXCLUDE_FILE"

echo "==> Creating ${SYNC_BRANCH}"
git checkout -B "${SYNC_BRANCH}"

echo "==> Merging prod/${PROD_BRANCH} (prod wins on conflicts)"
git merge --allow-unrelated-histories -X theirs prod/main -m "Sync from prod $(date +%Y-%m-%d)" || true

echo "==> Restoring demo's protected files"
while IFS= read -r path; do
  [[ -z "$path" || "$path" =~ ^# ]] && continue
  if [[ -e "$TMP_PROTECT/$path" ]]; then
    rm -rf "$path"
    mkdir -p "$(dirname "$path")"
    cp -R "$TMP_PROTECT/$path" "$path"
    git add "$path" || true
    echo "   restored: $path"
  elif [[ -e "$path" ]]; then
    git rm -rf --quiet "$path" || true
    echo "   removed (not in demo): $path"
  fi
done < "$EXCLUDE_FILE"

if ! git diff --cached --quiet; then
  git commit -m "Restore demo-protected files after prod sync (${DATE_TAG})"
fi

echo "==> Pushing ${SYNC_BRANCH}"
git push -u origin "${SYNC_BRANCH}"

echo "==> Done. Open a PR from ${SYNC_BRANCH} into main."