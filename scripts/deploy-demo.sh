#!/bin/sh
# Build the static demo and publish it to the PUBLIC pages repo.
# (GitHub Pages isn't available on the private main repo's plan; the demo is
# meant to be shared anyway, so it lives at booherbg/new-game-demo.)
#   ./scripts/deploy-demo.sh
set -e
cd "$(dirname "$0")/.."
npm run build -w apps/demo

# #115 reload-nudge: drop a tiny version.json next to the bundle stamped with the SAME commit
# SHA the app bakes in via __ART_VER__ (vite.config computes it the same way). An already-open
# tab re-fetches this on focus/visibility and, if the served build differs from the one it's
# running, offers a reload. No version.json in a dev build → the check just no-ops.
printf '{"build":"%s"}\n' "$(git rev-parse --short HEAD)" > apps/demo/dist/version.json

# Playability gate (issue #18): drive the freshly built bundle — begin a game, play it,
# run a sim. A blank screen or page error aborts the deploy before anything is pushed.
python3 -m http.server 4199 -d apps/demo/dist >/dev/null 2>&1 &
GATE_PID=$!
trap 'kill $GATE_PID 2>/dev/null' EXIT
sleep 1
DEMO_URL=http://localhost:4199 npx tsx scripts/verify-demo.ts
kill $GATE_PID 2>/dev/null; trap - EXIT

cd apps/demo/dist
touch .nojekyll
rm -rf .git
git init -q -b main
git add -A
git commit -q -m "deploy demo $(date +%Y-%m-%d-%H%M)"
git push -f git@github.com:booherbg/new-game-demo.git main
rm -rf .git
echo "→ https://booherbg.github.io/new-game-demo/"
