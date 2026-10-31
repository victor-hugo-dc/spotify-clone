#!/bin/sh
# Browser smoke test: builds the client, runs the production server with a fake Spotify login, and drives the app in
# headless Chromium with the Spotify Web API answered from data.mjs. Needs Docker.
# Usage: sh e2e/run.sh [screenshot dir, default e2e/shots]
set -e
E2E=$(cd "$(dirname "$0")" && pwd)
REPO=$(dirname "$E2E")
SHOTS=$(mkdir -p "${1:-$E2E/shots}" && cd "${1:-$E2E/shots}" && pwd)
NAME=shoutify-e2e-$(basename "$REPO")
# A git worktree may link node_modules from another checkout; mount the real directory where the link points.
MODULES=$(realpath "$REPO/node_modules")
[ -d "$E2E/node_modules" ] || docker run --rm -v "$E2E":/e -w /e node:24.22.1-alpine npm ci --silent --no-audit --no-fund
(cd "$REPO" && npx vite build --logLevel error)
docker network create shoutify-e2e >/dev/null 2>&1 || true
docker rm -f "$NAME" >/dev/null 2>&1 || true
docker run -d --name "$NAME" --network shoutify-e2e -v "$REPO":/w -v "$MODULES":"$MODULES" -w /w \
  -e NODE_ENV=production -e PORT=4000 -e DB_PATH=/tmp/test.db -e CLIENT_ID=x -e CLIENT_SECRET=y \
  -e RE_URI=http://127.0.0.1:5173/api/callback node:24.22.1-alpine node --import /w/e2e/mock-spotify.mjs server/index.ts >/dev/null
sleep 1.5
docker run --rm --network shoutify-e2e -v "$E2E":/e2e -v "$SHOTS":/shots -w /e2e mcr.microsoft.com/playwright:v1.63.0-noble \
  node smoke.mjs "http://$NAME:4000" /shots || STATUS=$?
docker logs "$NAME" 2>&1 | grep -v "^Listening" | tail -5
docker rm -f "$NAME" >/dev/null
exit ${STATUS:-0}
