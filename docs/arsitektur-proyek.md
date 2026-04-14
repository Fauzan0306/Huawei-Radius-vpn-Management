# Arsitektur Project VPN Management

Dokumen ini dibuat sebagai ringkasan cepat agar repo lebih mudah dipahami saat dipublikasikan ke GitHub.

## 1. Struktur Besar

- `server/` berisi backend Express.js.
- `client/` berisi frontend Vue 3 + Vite.
- `docs/` berisi panduan operasional dan dokumentasi tambahan.
- `deploy/` berisi contoh service systemd untuk production.

## 2. Alur Runtime

### Development

- Jalankan `npm run dev` dari root project.
- Root workspace akan menyalakan:
  - backend di `server`
  - frontend Vite di `client`
- Vite mem-proxy request `/api` ke backend Express.

### Production

- Jalankan `npm run build` untuk membangun frontend.
- Jalankan `npm start` untuk menjalankan backend.
- Backend akan sekaligus melayani file hasil build frontend dari `client/dist`.

## 3. Alur Login

- User membuka halaman login Vue.
- Frontend mengirim `POST /api/auth/login`.
- Backend memverifikasi `ADMIN_USERNAME` dan password dari `.env`.
- Jika valid, backend membuat cookie `vpn_admin_token`.
- Setiap halaman privat memverifikasi sesi lewat `GET /api/auth/me`.

## 4. Alur Manajemen User

- Data user utama diambil dari `radcheck`.
- Role Huawei `Filter-Id` diambil dari `radreply`.
- Frontend menampilkan satu row per username, walau di database satu user tersimpan dalam beberapa attribute row.

### Create User

- insert `Cleartext-Password` ke `radcheck`
- opsional insert `Expiration`
- opsional insert `Simultaneous-Use`
- simpan `Filter-Id` ke `radreply`

### Edit User

- update hanya attribute tambahan
- username tidak diubah
- password tidak diubah dari form edit umum

### Reset Password

- mengganti `Cleartext-Password`

### Delete User

- menghapus semua row username dari `radcheck`
- menghapus semua row username dari `radreply`

## 5. Alur Session

Project mendukung dua mode:

- `radius`: baca dari `radacct`
- `huawei`: baca dari `vpn_sessions`

Mode aktif ditentukan oleh `SESSION_SOURCE`.

## 6. Huawei Session Mode

Pada mode Huawei, ada dua sumber input:

- syslog Huawei langsung
- snapshot sinkronisasi periodik

### Syslog Listener

- proses backend membuka UDP listener
- pesan login/logout Huawei diparsing
- event disimpan ke tabel `vpn_sessions`

### Snapshot Sync

- backend bisa membaca snapshot sesi aktif dari file atau command
- hasil snapshot dipakai untuk rekonsiliasi sesi aktif yang tersimpan

## 7. File yang Paling Penting Saat Onboarding

- `server/src/index.js`
- `server/src/config.js`
- `server/src/routes/`
- `server/src/services/users.js`
- `server/src/services/sessions.js`
- `server/src/services/huaweiSessions.js`
- `server/src/services/huaweiSyslogListener.js`
- `client/src/main.js`
- `client/src/components/AppShell.vue`
- `client/src/pages/`

## 8. Catatan Publikasi GitHub

Sebelum di-publish:

- pastikan `.env` tidak ikut ter-commit
- gunakan `.env.example` sebagai template konfigurasi
- kalau perlu, tambah screenshot UI ke README
- kalau perlu, tambah bagian "Architecture" di README yang mengarah ke dokumen ini
