#!/usr/bin/env bash

# One-shot deploy from development to production while preserving live data.
# Usage:
#   bash scripts/deploy_to_prod.sh          # sync + npm install (frontend + server)
#   SKIP_INSTALL=1 bash scripts/deploy_to_prod.sh   # skip npm install steps
#   DRY_RUN=1 bash scripts/deploy_to_prod.sh        # preview rsync only
#   PROD_DIR=/custom/path bash scripts/deploy_to_prod.sh

set -euo pipefail

DEV_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROD_DIR="${PROD_DIR:-/Users/digogonz/Desktop/Calendario/cal-ap}"

if [[ ! -d "$PROD_DIR" ]]; then
  echo "Production directory not found: $PROD_DIR" >&2
  exit 1
fi

echo "=== Deploying dev -> prod ==="
echo "DEV:  $DEV_DIR"
echo "PROD: $PROD_DIR"

# Run the rsync-based patch (respects DRY_RUN)
DRY_RUN="${DRY_RUN:-0}" bash "$DEV_DIR/scripts/patch_to_prod.sh" "$PROD_DIR"

if [[ "${DRY_RUN:-0}" == "1" ]]; then
  echo "DRY_RUN set; skipping installs."
  exit 0
fi

if [[ "${SKIP_INSTALL:-0}" != "1" ]]; then
  echo "=== Installing frontend deps in production copy ==="
  (cd "$PROD_DIR" && npm install)
  echo "=== Installing server deps in production copy ==="
  (cd "$PROD_DIR/server" && npm install)
else
  echo "SKIP_INSTALL=1; skipping npm installs."
fi

echo "=== Done. Restart production services if they are running. ==="
