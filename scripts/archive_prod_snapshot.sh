#!/usr/bin/env bash
set -euo pipefail

SOURCE="/Users/digogonz/Desktop/Calendario/cal-ap"
DEST_ROOT="/Users/digogonz/Desktop/Calendario/VersionesPasadas"

if [[ ! -d "$SOURCE" ]]; then
    echo "Source not found: $SOURCE" >&2
    exit 1
fi

mkdir -p "$DEST_ROOT"

latest=0
for path in "$DEST_ROOT"/*; do
    [[ -d "$path" ]] || continue
    base="$(basename "$path")"
    if [[ "$base" =~ ^[0-9]+$ ]]; then
        if (( base > latest )); then
            latest="$base"
        fi
    fi
done

next=$((latest + 1))
target="$DEST_ROOT/$next"

if [[ -e "$target" ]]; then
    echo "Target already exists: $target" >&2
    exit 1
fi

mkdir -p "$target"
rsync -a \
    --exclude 'node_modules' \
    --exclude 'server/node_modules' \
    --exclude '.git' \
    "$SOURCE"/ "$target"/
echo "Archived $SOURCE to $target (excluding node_modules and .git)"
