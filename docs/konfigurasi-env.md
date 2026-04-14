# Referensi Konfigurasi `.env`

Dokumen ini menjelaskan variabel environment yang dipakai project agar repo lebih mudah dipahami saat dipindahkan ke GitHub atau dideploy ke server lain.

## App Server

- `HOST`
  Alamat bind backend Express.
- `PORT`
  Port backend Express.
- `CLIENT_URL`
  URL frontend yang diizinkan untuk akses API dengan cookie.

## Admin Login

- `JWT_SECRET`
  Secret untuk JWT admin.
- `ADMIN_USERNAME`
  Username admin aplikasi.
- `ADMIN_PASSWORD`
  Password plaintext admin.
- `ADMIN_PASSWORD_HASH`
  Alternatif yang lebih aman jika ingin menyimpan password admin dalam bentuk bcrypt hash.
- `ADMIN_DISPLAY_NAME`
  Nama admin yang tampil di UI.
- `ADMIN_EMAIL`
  Email admin yang tampil di UI.

Catatan:

- Jika `ADMIN_PASSWORD_HASH` diisi, backend akan memakainya terlebih dahulu.
- Jika mengubah nilai admin di server production, service perlu direstart.

## Timezone Operasional

- `APP_TIMEZONE_OFFSET_MINUTES`
  Dipakai untuk filter tanggal operasional aplikasi.

Contoh:

- `-480` berarti UTC+08:00.

## Database

- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`

Backend memakai konfigurasi ini untuk koneksi `mysql2` ke MariaDB.

## Session Source

- `SESSION_SOURCE`
  Menentukan sumber session log.

Nilai yang didukung:

- `radius`
  Session dibaca dari `radacct`.
- `huawei`
  Session dibaca dari `vpn_sessions`.

- `SESSION_INGEST_TOKEN`
  Token untuk endpoint ingest internal Huawei.

## Huawei Snapshot Sync

- `HUAWEI_SESSION_SNAPSHOT_MODE`
  Mode sinkronisasi snapshot.
- `HUAWEI_SESSION_COMMAND`
  Command yang dijalankan jika mode `command`.
- `HUAWEI_SESSION_FILE`
  Path file snapshot jika mode `file`.
- `HUAWEI_SESSION_SYNC_INTERVAL_SECONDS`
  Interval background sync.
- `HUAWEI_SESSION_COMMAND_TIMEOUT_MS`
  Timeout saat menjalankan command snapshot.

Nilai `HUAWEI_SESSION_SNAPSHOT_MODE`:

- `disabled`
- `command`
- `file`

## Huawei Syslog Listener

- `HUAWEI_SYSLOG_LISTENER_ENABLED`
  Mengaktifkan listener UDP syslog.
- `HUAWEI_SYSLOG_HOST`
  Host bind listener.
- `HUAWEI_SYSLOG_PORT`
  Port bind listener.
- `HUAWEI_SYSLOG_TIMEZONE`
  Offset timestamp syslog.
- `HUAWEI_SYSLOG_DEDUP_WINDOW_SECONDS`
  Window dedup untuk log kembar.
- `HUAWEI_SYSLOG_LOG_IGNORED`
  Jika `true`, log yang tidak cocok pattern tetap dicatat.

## RADIUS Disconnect / CoA

- `RADIUS_NAS_IP`
  IP NAS/firewall tujuan disconnect request.
- `RADIUS_COA_SECRET`
  Shared secret untuk CoA/disconnect request.
- `RADIUS_COA_PORT`
  Port CoA, default umumnya `3799`.

Konfigurasi ini dibutuhkan hanya jika fitur force disconnect session ingin dipakai.

## Rekomendasi Saat Publish ke GitHub

- Commit hanya `.env.example`, jangan commit `.env`.
- Jangan taruh secret asli di README atau dokumentasi.
- Jika server production punya konfigurasi tambahan, dokumentasikan nama variabelnya tanpa menulis nilainya.
