# VPN Management Admin Panel

Simple admin panel for managing FreeRADIUS VPN users stored in `radcheck` and monitoring sessions from either `radacct` or a custom `vpn_sessions` table for Huawei SSL VPN.

## Documentation

- Detailed operating guide: [`docs/panduan-operasional.md`](./docs/panduan-operasional.md)
- Architecture overview: [`docs/arsitektur-proyek.md`](./docs/arsitektur-proyek.md)
- Environment reference: [`docs/konfigurasi-env.md`](./docs/konfigurasi-env.md)

## Stack

- Express.js API
- Vue 3 + Vite frontend
- Tailwind CSS styling
- MariaDB integration via `mysql2`

## Features in v1

- Env-based admin login
- Dashboard statistics
- VPN user CRUD against `radcheck`
- Password reset
- Expiration date management
- `Simultaneous-Use` management
- Huawei `Filter-Id` authorization management via `radreply`
- Session log filtering from `radacct` or `vpn_sessions`
- Built-in Huawei UDP syslog listener
- Internal ingest API for Huawei SSL VPN login and logout events

## Setup

1. Copy `.env.example` to `.env`
2. Fill in your MariaDB and admin credentials
3. Install dependencies:
   `npm install`
4. Run development mode:
   `npm run dev`

## Timezone

Set the operational timezone offset for date-based filtering:

```env
APP_TIMEZONE_OFFSET_MINUTES=-480
```

`-480` means UTC+08:00 and matches Makassar / WITA operations.

## Required MariaDB tables

- `radcheck`
- `radacct`
- `vpn_sessions` when using Huawei session mode

## Notes

- Recent users are derived from the latest `Cleartext-Password` entries in `radcheck`
- Delete user removes every `radcheck` row for the selected username
- Disable user is intentionally not included in v1
- For Huawei SSL VPN role authorization, store `Filter-Id` in `radreply`, not `radcheck`

## Session sources

By default the app can read session logs from either `radacct` or `vpn_sessions`.

To switch the session pages and dashboard to Huawei SSL VPN sessions, set:

```env
SESSION_SOURCE=huawei
```

Huawei mode keeps a local history table named `vpn_sessions`. The app reads active sessions and logout history from this table.

### Huawei syslog listener mode

Recommended for your environment:

```env
SESSION_SOURCE=huawei
SESSION_INGEST_TOKEN=replace-with-long-random-token
HUAWEI_SESSION_SNAPSHOT_MODE=disabled
HUAWEI_SYSLOG_LISTENER_ENABLED=true
HUAWEI_SYSLOG_HOST=0.0.0.0
HUAWEI_SYSLOG_PORT=514
HUAWEI_SYSLOG_TIMEZONE=+00:00
```

When enabled, the same Node.js app listens for Huawei syslog packets and writes sessions into `vpn_sessions`.

Supported Huawei events:

- `%%01SSLVPN/6/USERLOGINSUCC`
- `%%01SSLVPN/6/USERLOGOUT`

The listener uses `CID` as the primary session key and stores:

- `username`
- `login_time`
- `logout_time`
- `assigned_ip`
- `client_ip`
- `gateway_name`
- `input_bytes`
- `output_bytes`

Notes:

- In this Huawei SSL VPN deployment, the syslog header timestamps are treated as UTC, so the default is `+00:00`.
- Duplicate syslog lines are ignored for a short configurable window.
- The web dashboard and session logs read from `vpn_sessions` when `SESSION_SOURCE=huawei`.

### Optional internal ingest API

If you later want a separate parser process instead of the built-in UDP listener, you can still send events to:

- `POST /api/internal/sessions/login`
- `POST /api/internal/sessions/logout`

Use this header:

```text
X-Ingest-Token: <SESSION_INGEST_TOKEN>
```

Example login payload:

```json
{
  "username": "fauzan",
  "sessionId": "vpn-123",
  "cid": "CID-123",
  "loginTime": "2026-03-16T07:11:13Z",
  "assignedIp": "15.15.15.205",
  "clientIp": "180.251.145.161",
  "gatewayName": "VPN_RADIUS",
  "nasIp": "10.10.160.1",
  "rawLoginLog": "%%01SSLVPN/6/USERLOGINSUCC..."
}
```

Example logout payload:

```json
{
  "sessionId": "vpn-123",
  "cid": "CID-123",
  "username": "fauzan",
  "logoutTime": "2026-03-16T09:00:00Z",
  "inputBytes": 20849784,
  "outputBytes": 629426,
  "rawLogoutLog": "%%01SSLVPN/6/USERLOGOUT..."
}
```

### Huawei snapshot input

Optional alternative if you want polling from a current-session snapshot instead of syslog events:

1. Command mode:

```env
HUAWEI_SESSION_SNAPSHOT_MODE=command
HUAWEI_SESSION_COMMAND=/usr/local/bin/huawei-session-export
```

2. File mode:

```env
HUAWEI_SESSION_SNAPSHOT_MODE=file
HUAWEI_SESSION_FILE=/var/log/huawei/active-sessions.json
```

The command or file must return JSON in this shape:

```json
[
  {
    "username": "fauzan",
    "loginTime": "2026-03-16T07:11:13Z",
    "assignedIp": "10.16.16.162",
    "accessIp": "10.10.160.105",
    "gatewayName": "VPN_RADIUS",
    "nasIp": "10.10.160.1"
  }
]
```

Notes:

- `loginTime` should ideally be ISO 8601 so the app can normalize it correctly.
- `sessionKey` is optional. If omitted, the app derives one from session ID, CID, or connection details.
- In Huawei mode, the dashboard and session log page read from `vpn_sessions`, not `radacct`.
