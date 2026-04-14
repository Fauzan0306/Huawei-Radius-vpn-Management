#!/usr/bin/env bash
set -euo pipefail

DB_HOST="${DB_HOST:-mariadb}"
DB_PORT="${DB_PORT:-3306}"
DB_NAME="${DB_NAME:-radius}"
DB_USER="${DB_USER:-radius}"
DB_PASSWORD="${DB_PASSWORD:-radius-password}"
RADIUS_CLIENT_IPADDR="${RADIUS_CLIENT_IPADDR:-0.0.0.0/0}"
RADIUS_CLIENT_SECRET="${RADIUS_CLIENT_SECRET:-testing123}"
RADIUS_CLIENT_SHORTNAME="${RADIUS_CLIENT_SHORTNAME:-docker-demo}"

export DB_HOST DB_PORT DB_NAME DB_USER DB_PASSWORD
export RADIUS_CLIENT_IPADDR RADIUS_CLIENT_SECRET RADIUS_CLIENT_SHORTNAME

# Wait until MariaDB accepts TCP connections so FreeRADIUS can start cleanly.
until mariadb-admin ping -h"${DB_HOST}" -P"${DB_PORT}" -u"${DB_USER}" -p"${DB_PASSWORD}" --silent; do
  echo "[freeradius] waiting for MariaDB at ${DB_HOST}:${DB_PORT}"
  sleep 2
done

envsubst < /tmp/sql.template > /etc/freeradius/3.0/mods-available/sql
envsubst < /tmp/clients.template > /etc/freeradius/3.0/clients.conf

ln -sf /etc/freeradius/3.0/mods-available/sql /etc/freeradius/3.0/mods-enabled/sql

# Debian's packaged config usually keeps SQL references disabled by default.
perl -0pi -e 's/^\s*-\s*sql\s*$/\tsql/mg' /etc/freeradius/3.0/sites-enabled/default /etc/freeradius/3.0/sites-enabled/inner-tunnel
perl -0pi -e 's/^\s*sql\s*$/\tsql/mg' /etc/freeradius/3.0/sites-enabled/default /etc/freeradius/3.0/sites-enabled/inner-tunnel

exec "$@"
