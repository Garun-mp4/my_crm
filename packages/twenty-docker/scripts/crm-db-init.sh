#!/bin/sh

set -eu

if [ "${SEED_DEV_ON_EMPTY:-true}" != "true" ]; then
  echo "Development seed is disabled."
  exit 0
fi

user_count="$(psql "$PG_DATABASE_URL" -tAc 'SELECT count(*) FROM "core"."user"' | tr -d '[:space:]')"

case "$user_count" in
  ''|0)
    echo "No users found. Seeding a light development workspace."
    yarn command:prod workspace:seed:dev --light
    ;;
  *)
    echo "Found ${user_count} existing user(s). Skipping development seed."
    ;;
esac
