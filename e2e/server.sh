#!/usr/bin/env sh
set -eu

# Every run uses separate databases and file storage. It can therefore reset
# them without changing the development environment.
export ADACTA_DB_DIR=".adacta/e2e/db"
export ADACTA_STORAGE_DIR=".adacta/e2e/storage"
export ADACTA_URL="http://localhost:5273"
export ADACTA_AUTH_SECRET="adacta-e2e-secret-for-local-tests-only"
export ADACTA_LOG_LEVEL="warn"
unset ADACTA_DEV_USER
unset NODE_ENV

bun run db:setup demo

# The tests run against a production build. See the comment on webServer in
# playwright.config.ts.
NODE_ENV=production bun run build
export NODE_ENV=production
export PORT=5273
exec bun run start
