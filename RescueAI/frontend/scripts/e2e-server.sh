#!/usr/bin/env bash
# Starts a throwaway backend (SQLite in a temp dir) that serves the built PWA, for e2e tests.
set -euo pipefail
cd "$(dirname "$0")/../../backend"
TMP=$(mktemp -d)
export RESCUE_ENVIRONMENT=test RESCUE_DATABASE_URL="sqlite:///$TMP/e2e.db" RESCUE_STORAGE_DIR="$TMP/storage" RESCUE_BCRYPT_ROUNDS=4
. .venv/bin/activate
python -m app.cli init-db
echo "e2e-password-123" | python -m app.cli create-user medic --password-stdin
python -m app.cli seed
exec uvicorn app.main:app --host 127.0.0.1 --port 8765 --log-level warning
