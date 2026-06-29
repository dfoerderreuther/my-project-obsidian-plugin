#!/bin/bash
set -e

cd "$(dirname "$0")"

# Load local config (gitignored). Copy .env.example to .env and set VAULT.
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

if [ -z "$VAULT" ]; then
  echo "Error: VAULT is not set. Copy .env.example to .env and set your vault path." >&2
  exit 1
fi

PLUGIN_ID="my-project-panel"
PLUGIN_DIR="$VAULT/.obsidian/plugins/$PLUGIN_ID"

echo "Building..."
node esbuild.config.mjs production

echo "Installing to $PLUGIN_DIR"
mkdir -p "$PLUGIN_DIR"
cp main.js manifest.json styles.css "$PLUGIN_DIR/"

echo "Done. Reload Obsidian (or toggle the plugin in Settings > Community plugins)."
