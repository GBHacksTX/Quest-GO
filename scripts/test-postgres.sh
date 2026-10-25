#!/usr/bin/env bash
set -euo pipefail
# Creates an isolated temporary server; it never connects to your configured live database.
pg_bin="${PG_BIN_DIR:-/opt/homebrew/opt/postgresql@17/bin}"
if [[ ! -x "$pg_bin/initdb" ]]; then
  echo "Set PG_BIN_DIR to the directory containing initdb, pg_ctl and createdb."
  exit 1
fi
test_cluster="$(mktemp -d /tmp/questgo-postgres.XXXXXX)"
trap '"$pg_bin/pg_ctl" -D "$test_cluster/data" -m fast stop >/dev/null 2>&1 || true' EXIT
"$pg_bin/initdb" -D "$test_cluster/data" -A trust --no-locale --encoding=UTF8 >"$test_cluster/init.log"
"$pg_bin/pg_ctl" -D "$test_cluster/data" -o "-h 127.0.0.1 -p 55439 -k $test_cluster" -l "$test_cluster/server.log" start
"$pg_bin/createdb" -h 127.0.0.1 -p 55439 questgo_test
QUESTGO_TEST_DATABASE_URL="postgresql://127.0.0.1:55439/questgo_test" npx tsx scripts/check-postgres.ts
