#!/usr/bin/env sh
# SecureID - one-command start for macOS / Linux.
# Builds the React app, bundles it into Spring Boot and starts everything on http://localhost:8080
set -e
cd "$(dirname "$0")"

command -v java >/dev/null 2>&1 || { echo "[ERROR] Java 17 or newer is required: https://adoptium.net"; exit 1; }
command -v npm  >/dev/null 2>&1 || { echo "[ERROR] Node.js 20 or newer is required: https://nodejs.org"; exit 1; }

echo
echo "[1/3] Installing frontend dependencies..."
(cd frontend && npm install --no-audit --no-fund)

echo
echo "[2/3] Building frontend..."
(cd frontend && npm run build)

rm -rf backend/src/main/resources/static
cp -R frontend/dist backend/src/main/resources/static

echo
echo "[3/3] Starting the app (first run downloads Maven dependencies, ~1-2 min)..."
echo
echo "    When you see \"Started BackendApplication\", open:  http://localhost:8080"
echo "    6-digit codes are shown on screen and printed in this terminal."
echo
cd backend
chmod +x mvnw
./mvnw -q spring-boot:run
