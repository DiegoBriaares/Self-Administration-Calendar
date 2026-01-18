#!/usr/bin/env bash
set -euo pipefail
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  . "$NVM_DIR/nvm.sh"
elif [ -s /opt/homebrew/opt/nvm/nvm.sh ]; then
  . /opt/homebrew/opt/nvm/nvm.sh
fi
if command -v nvm >/dev/null 2>&1; then
  nvm use 20
else
  echo "nvm not found. Please install nvm or start Node 20 manually."
  exit 1
fi
npm start
