# VPN Management Admin Panel

Panel admin sederhana untuk mengelola user VPN FreeRADIUS yang disimpan di `radcheck` dan memantau session dari `radacct` atau tabel kustom `vpn_sessions` untuk Huawei SSL VPN.

## Dokumentasi

- Panduan instalasi dan setup: [`docs/instalasi-dan-setup.md`](./docs/instalasi-dan-setup.md)
- Panduan operasional: [`docs/panduan-operasional.md`](./docs/panduan-operasional.md)
- Ringkasan arsitektur: [`docs/arsitektur-proyek.md`](./docs/arsitektur-proyek.md)
- Referensi environment: [`docs/konfigurasi-env.md`](./docs/konfigurasi-env.md)

## Stack

- Express.js API
- Vue 3 + Vite frontend
- Tailwind CSS
- MariaDB melalui `mysql2`

## Fitur v1

- Login admin berbasis `.env`
- Statistik dashboard
- CRUD user VPN pada `radcheck`
- Reset password
- Pengelolaan tanggal kedaluwarsa akun
- Pengelolaan `Simultaneous-Use`
- Pengelolaan otorisasi Huawei `Filter-Id` di `radreply`
- Filter log session dari `radacct` atau `vpn_sessions`
- Listener syslog Huawei UDP bawaan
- Internal ingest API untuk event login dan logout Huawei SSL VPN

## Kebutuhan Sistem

- Node.js 18+ dan npm
- MariaDB
- FreeRADIUS dengan SQL module
- Tabel SQL RADIUS standar seperti `radcheck`, `radreply`, dan `radacct`
- Akses syslog Huawei USG6555F jika menggunakan mode session Huawei

## Tabel Database yang Dibutuhkan

Project ini bukan backend VPN mandiri. Aplikasi ini mengasumsikan Anda sudah memiliki database SQL RADIUS.

Tabel minimum yang digunakan aplikasi:

- `radcheck`
- `radreply`
- `radacct`
- `vpn_sessions` pada mode Huawei

Catatan:

- `radcheck`, `radreply`, dan `radacct` biasanya berasal dari schema SQL bawaan FreeRADIUS.
- `vpn_sessions` akan dibuat otomatis oleh aplikasi saat mode Huawei aktif.
- `Filter-Id` dikelola dari `radreply`, bukan `radcheck`.

## Quick Start

1. Salin `.env.example` menjadi `.env`
2. Isi kredensial MariaDB, admin, dan sumber session
3. Install dependency:
   `npm install`
4. Jalankan mode development:
   `npm run dev`

Untuk instalasi lengkap dari server kosong, termasuk setup FreeRADIUS SQL, ikuti:

[`docs/instalasi-dan-setup.md`](./docs/instalasi-dan-setup.md)

## Quick Start dengan Docker

Jika Anda ingin stack demo yang lebih praktis, repository ini juga sudah menyediakan:

- container aplikasi
- container MariaDB
- container FreeRADIUS
- schema SQL awal dan data demo

Jalankan:

```bash
docker compose up --build
```

Setelah service aktif:

- aplikasi web: `http://localhost:3010`
- login admin: `admin`
- password admin: `admin123`
- user RADIUS demo: `demo.user`
- password RADIUS demo: `demo12345`

Catatan:

- demo Docker memakai `SESSION_SOURCE=radius` secara default
- service MariaDB dan FreeRADIUS di compose ini ditujukan untuk demo dan pengembangan lokal
- `vpn_sessions` tetap akan dibuat otomatis jika nanti Anda mengganti aplikasi ke mode Huawei

Untuk menguji user RADIUS demo dari dalam stack:

```bash
docker compose exec freeradius radtest demo.user demo12345 127.0.0.1 0 testing123
```

Untuk menghentikan stack:

```bash
docker compose down
```

Untuk menghapus volume database demo juga:

```bash
docker compose down -v
```

## Timezone

Atur offset timezone operasional aplikasi untuk filter berbasis tanggal:

```env
APP_TIMEZONE_OFFSET_MINUTES=-480
```

`-480` berarti UTC+08:00 dan sesuai dengan Makassar / WITA.

## Catatan

- User terbaru diambil dari entri `Cleartext-Password` paling akhir di `radcheck`
- Hapus user akan menghapus seluruh row `radcheck` untuk username yang dipilih
- Fitur disable user memang belum disertakan di v1
- Untuk otorisasi role Huawei SSL VPN, gunakan `Filter-Id` di `radreply`, bukan `radcheck`

## Sumber Session

Secara default aplikasi dapat membaca session log dari `radacct` atau `vpn_sessions`.

Untuk mengganti halaman session dan dashboard ke mode Huawei SSL VPN, gunakan:

```env
SESSION_SOURCE=huawei
```

Pada mode Huawei, aplikasi menyimpan histori lokal di tabel `vpn_sessions`. Dashboard dan halaman session akan membaca dari tabel tersebut.

### Mode Listener Syslog Huawei

Konfigurasi yang direkomendasikan:

```env
SESSION_SOURCE=huawei
SESSION_INGEST_TOKEN=replace-with-long-random-token
HUAWEI_SESSION_SNAPSHOT_MODE=disabled
HUAWEI_SYSLOG_LISTENER_ENABLED=true
HUAWEI_SYSLOG_HOST=0.0.0.0
HUAWEI_SYSLOG_PORT=514
HUAWEI_SYSLOG_TIMEZONE=+00:00
```

Jika aktif, aplikasi Node.js yang sama akan mendengarkan paket syslog Huawei dan menulis session ke `vpn_sessions`.

Event Huawei yang didukung:

- `%%01SSLVPN/6/USERLOGINSUCC`
- `%%01SSLVPN/6/USERLOGOUT`

Listener menggunakan `CID` sebagai dasar identitas session dan menyimpan:

- `username`
- `login_time`
- `logout_time`
- `assigned_ip`
- `client_ip`
- `gateway_name`
- `input_bytes`
- `output_bytes`

Catatan:

- Pada deployment Huawei SSL VPN ini, timestamp syslog diperlakukan sebagai UTC, sehingga default yang dipakai adalah `+00:00`
- Log duplikat akan diabaikan dalam jendela waktu singkat yang bisa dikonfigurasi
- Dashboard dan halaman session akan membaca `vpn_sessions` saat `SESSION_SOURCE=huawei`

### Internal Ingest API Opsional

Jika nanti Anda ingin parser terpisah dari listener UDP bawaan, Anda tetap bisa mengirim event ke:

- `POST /api/internal/sessions/login`
- `POST /api/internal/sessions/logout`

Gunakan header berikut:

```text
X-Ingest-Token: <SESSION_INGEST_TOKEN>
```

Contoh payload login:

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

Contoh payload logout:

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

### Input Snapshot Huawei

Alternatif opsional jika Anda ingin polling dari snapshot current-session, bukan dari event syslog:

1. Mode command:

```env
HUAWEI_SESSION_SNAPSHOT_MODE=command
HUAWEI_SESSION_COMMAND=/usr/local/bin/huawei-session-export
```

2. Mode file:

```env
HUAWEI_SESSION_SNAPSHOT_MODE=file
HUAWEI_SESSION_FILE=/var/log/huawei/active-sessions.json
```

Command atau file tersebut harus menghasilkan JSON seperti ini:

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

Catatan:

- `loginTime` idealnya memakai format ISO 8601 agar aplikasi bisa menormalkan waktu dengan benar
- `sessionKey` bersifat opsional. Jika tidak ada, aplikasi akan menurunkannya dari session ID, CID, atau detail koneksi
- Pada mode Huawei, dashboard dan halaman session membaca `vpn_sessions`, bukan `radacct`

## Development

Dari root project:

```bash
npm install
npm run dev
```

Perintah ini akan menyalakan:

- backend Express API
- frontend Vite dev server

Pada mode development, Vite akan mem-proxy request `/api` ke backend.

## Production

Build frontend:

```bash
npm run build
```

Jalankan backend:

```bash
npm start
```

Pada mode production, backend akan melayani frontend build dari `client/dist`.

Jika menggunakan unit systemd bawaan:

```bash
sudo cp deploy/manajemen-vpn.service /etc/systemd/system/manajemen-vpn.service
sudo systemctl daemon-reload
sudo systemctl enable --now manajemen-vpn
```

## Struktur Project

```text
.
|-- client/   # frontend Vue 3 + Vite
|-- docker/   # file pendukung Docker
|-- server/   # Express API dan service Huawei/RADIUS
|-- docs/     # dokumentasi project
|-- deploy/   # contoh deployment
```
