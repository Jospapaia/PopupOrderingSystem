#!/bin/bash
set -e

SERVER="root@178.105.141.67"
APP_DIR="/app/Popup"

echo "→ Deploying to $SERVER..."

ssh $SERVER "
  cd $APP_DIR &&
  git pull &&
  docker compose up -d --build backend &&
  echo '✓ Done'
"

echo "→ Verifying health..."
sleep 3
curl -sf https://api.yossiscookies.store/health && echo " ✓ Backend healthy" || echo " ✗ Health check failed"
