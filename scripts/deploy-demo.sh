#!/bin/sh
# Build the static demo and publish it to the PUBLIC pages repo.
# (GitHub Pages isn't available on the private main repo's plan; the demo is
# meant to be shared anyway, so it lives at booherbg/new-game-demo.)
#   ./scripts/deploy-demo.sh
set -e
cd "$(dirname "$0")/.."
npm run build -w apps/demo
cd apps/demo/dist
touch .nojekyll
rm -rf .git
git init -q -b main
git add -A
git commit -q -m "deploy demo $(date +%Y-%m-%d-%H%M)"
git push -f git@github.com:booherbg/new-game-demo.git main
rm -rf .git
echo "→ https://booherbg.github.io/new-game-demo/"
