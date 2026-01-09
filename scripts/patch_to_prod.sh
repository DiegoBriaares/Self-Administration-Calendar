#!/usr/bin/env bash

# Sync development changes into the production copy without touching live data.
# Usage:
#   bash scripts/patch_to_prod.sh             # sync using default production path
#   DRY_RUN=1 bash scripts/patch_to_prod.sh   # show what would change
#   PROD_DIR=/custom/path bash scripts/patch_to_prod.sh

set -euo pipefail

DEV_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROD_DIR="${PROD_DIR:-${1:-/Users/digogonz/Desktop/Calendario/cal-ap}}"

if [[ ! -d "$PROD_DIR" ]]; then
  echo "Production directory not found: $PROD_DIR" >&2
  exit 1
fi

echo "Syncing development -> production"
echo "  from: $DEV_DIR"
echo "    to: $PROD_DIR"

RSYNC_ARGS=(
  --archive
  --verbose
  --human-readable
  --delete
)

# Do a dry-run when DRY_RUN=1 is set.
if [[ "${DRY_RUN:-0}" == "1" ]]; then
  RSYNC_ARGS+=(--dry-run)
  echo "Running in DRY RUN mode (no changes will be written)."
fi

# Exclude build artifacts and local-only files.
EXCLUDES=(
  ".git"
  "node_modules"
  "server/node_modules"
  "dist"
  "server.log"
  "*.log"
  "Bugs"
  "Enhancements"
  "server/calendar.db*"
  "server/uploads"
  "uploads"
)

# Protect live data so it is never overwritten or deleted.
PROTECTED=(
  "server/calendar.db"
  "server/calendar.db-shm"
  "server/calendar.db-wal"
  "server/uploads/***"
  "uploads/***"
)

for pattern in "${EXCLUDES[@]}"; do
  RSYNC_ARGS+=(--exclude "$pattern")
done

for pattern in "${PROTECTED[@]}"; do
  RSYNC_ARGS+=(--filter "protect $pattern")
done

rsync "${RSYNC_ARGS[@]}" "$DEV_DIR/" "$PROD_DIR/"

echo "Sync complete."
echo "Protected: calendar.db*, server/uploads/, uploads/"
echo "If dependencies changed, run npm install in $PROD_DIR (and in $PROD_DIR/server if needed), then restart the services."
