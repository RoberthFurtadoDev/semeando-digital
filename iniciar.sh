#!/usr/bin/env bash
# Sobe backend (8080) e frontend (5173). Ctrl+C encerra os dois.
cd "$(dirname "$0")"
(cd backend && mvn -q spring-boot:run) &
BACK=$!
(cd frontend && { [ -d node_modules ] || npm install; } && npm run dev) &
FRONT=$!
trap "kill $BACK $FRONT 2>/dev/null" EXIT
wait
