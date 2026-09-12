#!/bin/sh
set -e

setup_and_migrate_db() {
    if [ "${DISABLE_DB_MIGRATIONS}" = "true" ]; then
        echo "Database setup and migrations are disabled, skipping..."
        return
    fi

    # The Compose bootstrap service is kept alive so Docker Desktop's
    # `compose start` can start the complete application again after a stop.
    # Once its initialization marker exists, avoid rerunning the expensive
    # migration/upgrade path on every ordinary stop/start cycle. A recreated
    # container has no marker and performs the full initialization again.
    if [ "${PERSISTENT_DB_INIT:-false}" = "true" ] && [ -f /tmp/crm-db-init-ready ]; then
        echo "Database initialization already completed, skipping..."
        return
    fi

    echo "Running database setup and migrations..."

    # Run setup and migration scripts
    has_schema=$(psql -tAc "SELECT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'core')" ${PG_DATABASE_URL})
    if [ "$has_schema" = "f" ]; then
        echo "Database appears to be empty, running migrations."
        yarn database:init:prod
    fi

    if ! yarn command:prod cache:flush; then
        echo "Warning: Failed to flush cache before upgrade, but continuing startup..."
    fi

    if ! yarn command:prod upgrade; then
        echo "Warning: Upgrade completed with errors. Some workspaces may not be fully migrated. Check logs for details."
    fi

    if ! yarn command:prod cache:flush; then
        echo "Warning: Failed to flush cache after upgrade, but continuing startup..."
    fi

    echo "Successfully migrated DB!"
}

register_background_jobs() {
    if [ "${DISABLE_CRON_JOBS_REGISTRATION}" = "true" ]; then
        echo "Cron job registration is disabled, skipping..."
        return
    fi

    echo "Registering background sync jobs..."
    if yarn command:prod cron:register:all; then
        echo "Successfully registered all background sync jobs!"
    else
        echo "Warning: Failed to register background jobs, but continuing startup..."
    fi
}

setup_and_migrate_db
register_background_jobs

# Continue with the original Docker command
exec "$@"
