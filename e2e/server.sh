#!/usr/bin/env sh
set -eu

mode="${1-}"

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

case "$mode" in
	dev)
		exec bun --bun react-router dev --port 5273 --strictPort
		;;
	start)
		NODE_ENV=production bun run build
		export NODE_ENV=production
		export PORT=5273
		exec bun run start
		;;
	*)
		printf 'Usage: %s <dev|start>\n' "$0" >&2
		exit 2
		;;
esac
