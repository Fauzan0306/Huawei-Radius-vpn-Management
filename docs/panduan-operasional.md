# Panduan Operasional Aplikasi VPN Management

Dokumen ini menjelaskan cara mengoperasikan aplikasi web VPN Management yang ada di server ini, baik dari sisi admin harian maupun dari sisi pengelolaan aplikasi.

## 1. Gambaran Singkat

Aplikasi ini dipakai untuk:

- mengelola user VPN FreeRADIUS,
- mengubah password user VPN,
- mengatur masa aktif akun VPN,
- mengatur `Simultaneous-Use`,
- mengatur `Filter-Id` Huawei di `radreply`,
- memantau session VPN aktif dan riwayat login/logout.

Sumber data utama aplikasi:

- `radcheck` untuk data user VPN,
- `radreply` untuk `Filter-Id`,
- `vpn_sessions` untuk session Huawei SSL VPN,
- `.env` untuk login admin aplikasi.

Catatan penting:

- Pada deployment ini, session log dibaca dari `vpn_sessions`, bukan dari `radacct`.
- Session Huawei masuk ke `vpn_sessions` melalui syslog Huawei yang diterima aplikasi di UDP `514`.

## 2. Lokasi Project

Project berada di:

`/var/www/html/manajemen-vpn`

Service systemd yang menjalankan aplikasi:

`manajemen-vpn`

## 3. Cara Mengakses Web

Alamat web mengikuti IP server dan port aplikasi.

Contoh:

`http://10.10.166.99:3010`

Kalau halaman terlihat kosong atau muter terus:

- lakukan hard refresh browser,
- coba mode incognito,
- atau gunakan browser lain bila cache lama masih tersimpan.

## 4. Login Admin

Login admin aplikasi masih menggunakan data dari file `.env`, bukan dari database.

Parameter yang dipakai:

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `ADMIN_DISPLAY_NAME`
- `ADMIN_EMAIL`

Lokasi file:

`/var/www/html/manajemen-vpn/.env`

Catatan penting:

- Jika `ADMIN_PASSWORD`, `ADMIN_DISPLAY_NAME`, atau `ADMIN_EMAIL` diubah di `.env`, aplikasi harus direstart agar perubahan terbaca.
- Session admin lama bisa tetap aktif sampai cookie login habis masa berlakunya.

## 5. Struktur Menu Web

Menu utama saat ini:

- `Dashboard`
- `User Management`
- `Session Logs`

## 6. Dashboard

Halaman dashboard menampilkan ringkasan utama.

### 6.1 Total VPN Users

Menampilkan jumlah user unik dari tabel `radcheck`.

### 6.2 Active VPN Sessions

Menampilkan jumlah session aktif saat ini.

Pada deployment Huawei sekarang, angka ini diambil dari `vpn_sessions` dengan kondisi:

- `logout_time IS NULL`

### 6.3 Expired Accounts

Menampilkan jumlah akun yang sudah melewati tanggal `Expiration`.

### 6.4 Latest VPN Accounts

Menampilkan akun VPN terbaru yang terdeteksi dari data `radcheck`.

Arti "latest" saat ini:

- hanya membaca row `radcheck` dengan `attribute = 'Cleartext-Password'`,
- diurutkan berdasarkan `id` terbaru,
- maksimal `5` data terakhir.

Jadi ini bukan created date resmi, melainkan daftar akun terbaru berdasarkan urutan row password yang paling baru masuk ke `radcheck`.

### 6.5 Live VPN Connections

Menampilkan session VPN yang masih aktif sekarang, termasuk:

- username,
- login time,
- assigned IP,
- gateway atau NAS.

## 7. User Management

Halaman ini dipakai untuk mengelola akun VPN.

### 7.1 Data yang Ditampilkan

Kolom utama:

- `Username`
- `Expiration Date`
- `Simultaneous-Use`
- `Filter-Id`
- `Status`

### 7.2 Sumber Data

Data user berasal dari:

- `radcheck`
- `radreply`

Pemetaan field:

- `Cleartext-Password` di `radcheck` menandakan user punya password aktif,
- `Expiration` di `radcheck` menjadi masa berlaku akun,
- `Simultaneous-Use` di `radcheck` menjadi batas login bersamaan,
- `Filter-Id` di `radreply` menjadi role atau profile Huawei.

### 7.3 Status di User Management

Status di halaman ini adalah status akun, bukan status koneksi.

Label yang dipakai:

- `Account Active`
- `Account Expiring (H-x)`
- `Account Expired`

Logikanya:

- jika tidak ada `Expiration`, akun dianggap aktif,
- jika tanggal sudah lewat, akun menjadi expired,
- jika akan habis dalam jendela peringatan, akun menjadi expiring.

### 7.4 Create User

Tombol:

`Create user`

Field yang diisi:

- `Username`
- `Password`
- `Expiration Date`
- `Simultaneous-Use`
- `Filter-Id / Huawei Role`

Aturan:

- username wajib valid,
- password minimal `6` karakter,
- `Expiration Date` opsional,
- `Simultaneous-Use` opsional,
- `Filter-Id` opsional.

Saat berhasil dibuat:

- aplikasi menambah row `Cleartext-Password` ke `radcheck`,
- jika ada tanggal expiry, aplikasi menambah row `Expiration`,
- jika ada simultan, aplikasi menambah row `Simultaneous-Use`,
- jika ada `Filter-Id`, aplikasi menyimpannya ke `radreply`.

### 7.5 Edit User

Tombol:

`Edit`

Yang bisa diubah saat ini:

- `Expiration Date`
- `Simultaneous-Use`
- `Filter-Id`

Yang tidak bisa diubah langsung dari mode edit:

- `Username`
- `Password`

Alasannya:

- `Username` adalah identitas utama akun di `radcheck` dan `radreply`,
- rename username belum diaktifkan di v1,
- password dipisah ke aksi khusus `Reset password` agar lebih aman dan jelas.

### 7.6 Reset Password

Tombol:

`Reset password`

Fungsi:

- mengganti nilai `Cleartext-Password` untuk user yang dipilih,
- jika row password belum ada, aplikasi akan membuat row baru.

### 7.7 Delete User

Tombol:

`Delete`

Efeknya:

- menghapus seluruh row user tersebut di `radcheck`,
- menghapus seluruh row user tersebut di `radreply`.

Catatan:

- ini adalah delete permanen untuk data akun VPN pada aplikasi,
- tidak ada recycle bin atau soft delete di versi sekarang.

### 7.8 Pencarian dan Filter Status

Fitur yang tersedia:

- search berdasarkan username,
- tab filter status akun:
  - `All Users`
  - `Active Accounts`
  - `Expiring Soon`
  - `Expired Accounts`

## 8. Session Logs

Halaman ini dipakai untuk melihat koneksi VPN, bukan untuk melihat status akun.

### 8.1 Data yang Ditampilkan

Kolom utama:

- `Username`
- `Login Time`
- `Logout Time`
- `Duration`
- `Assigned IP`
- `Gateway / NAS`
- `Status`

### 8.2 Sumber Data Session

Pada deployment saat ini:

- session log berasal dari tabel `vpn_sessions`,
- session dibuat dari syslog Huawei SSL VPN,
- bukan dari `radacct`.

### 8.3 Status di Session Logs

Status di halaman ini adalah status koneksi.

Label yang dipakai:

- `Connected`
- `Disconnected`

Logikanya:

- jika `logout_time` masih `NULL`, session dianggap `Connected`,
- jika `logout_time` sudah terisi, session dianggap `Disconnected`.

### 8.4 Filter Session Logs

Filter yang tersedia:

- username,
- date from,
- date to,
- active only.

Default tampilan:

- menampilkan log hari ini saja,
- berdasarkan timezone operasional aplikasi,
- bukan berdasarkan timezone browser.

Timezone operasional dikontrol lewat:

`APP_TIMEZONE_OFFSET_MINUTES`

Nilai saat ini:

`-480`

Artinya:

- UTC+08:00
- sesuai Makassar / WITA

### 8.5 Arti Kolom Logout Time

Untuk session yang masih aktif:

- kolom `Logout Time` akan menampilkan `Connected`

Untuk session yang sudah selesai:

- kolom `Logout Time` akan menampilkan waktu logout sebenarnya.

### 8.6 Catatan Penting Session Huawei

Karena session Huawei saat ini masuk lewat syslog:

- aplikasi harus hidup saat event login/logout terjadi,
- jika aplikasi mati saat user login, session itu bisa tidak tercatat,
- jika aplikasi mati saat user logout, session bisa terlihat masih aktif sampai ada event koreksi.

## 9. Arti Data di Database

### 9.1 `radcheck`

Tabel ini menyimpan atribut user VPN.

Contoh:

- `Cleartext-Password`
- `Expiration`
- `Simultaneous-Use`

### 9.2 `radreply`

Tabel ini dipakai untuk atribut reply, pada project ini terutama:

- `Filter-Id`

### 9.3 `vpn_sessions`

Tabel ini menyimpan histori session Huawei SSL VPN.

Contoh field penting:

- `username`
- `session_key`
- `session_id`
- `cid`
- `login_time`
- `logout_time`
- `assigned_ip`
- `client_ip`
- `gateway_name`
- `nas_ip`
- `input_bytes`
- `output_bytes`

## 10. Cara Menjalankan Aplikasi

### 10.1 Mode Service

Mode yang dipakai di server ini adalah service systemd.

Start:

```bash
systemctl start manajemen-vpn
```

Stop:

```bash
systemctl stop manajemen-vpn
```

Restart:

```bash
systemctl restart manajemen-vpn
```

Cek status:

```bash
systemctl status manajemen-vpn
```

Lihat log:

```bash
journalctl -u manajemen-vpn -f
```

### 10.2 Mode Manual

Jika ingin menjalankan manual dari folder project:

```bash
cd /var/www/html/manajemen-vpn
npm start
```

Catatan:

- mode manual tidak direkomendasikan untuk operasional harian,
- di server ini sebaiknya tetap memakai `systemd`.

## 11. Aturan Setelah Mengubah File

### 11.1 Jika Mengubah `.env`

Contoh perubahan:

- password admin,
- nama admin,
- email admin,
- port,
- timezone aplikasi,
- sumber session,
- listener Huawei.

Setelah mengubah `.env`, jalankan:

```bash
systemctl restart manajemen-vpn
```

### 11.2 Jika Mengubah Backend

Setelah mengubah file backend, jalankan:

```bash
systemctl restart manajemen-vpn
```

### 11.3 Jika Mengubah Frontend

Setelah mengubah file frontend, jalankan:

```bash
cd /var/www/html/manajemen-vpn
npm run build
systemctl restart manajemen-vpn
```

Ini penting karena aplikasi production melayani hasil build dari folder `client/dist`.

## 12. Konfigurasi Penting di `.env`

Beberapa parameter penting:

- `HOST`
- `PORT`
- `JWT_SECRET`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `ADMIN_DISPLAY_NAME`
- `ADMIN_EMAIL`
- `APP_TIMEZONE_OFFSET_MINUTES`
- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `SESSION_SOURCE`
- `SESSION_INGEST_TOKEN`
- `HUAWEI_SYSLOG_LISTENER_ENABLED`
- `HUAWEI_SYSLOG_HOST`
- `HUAWEI_SYSLOG_PORT`
- `HUAWEI_SYSLOG_TIMEZONE`

Catatan penting:

- jangan simpan password admin baru di dokumentasi,
- perubahan `.env` baru berlaku setelah restart service.

## 13. Huawei Syslog Listener

Listener syslog Huawei sudah terintegrasi di proses Node yang sama.

Port default:

`UDP 514`

Jika service sehat, log biasanya menampilkan:

- `Huawei listener ready on udp://0.0.0.0:514`
- `VPN admin server listening on http://0.0.0.0:3010`

Event yang dibaca:

- `%%01SSLVPN/6/USERLOGINSUCC`
- `%%01SSLVPN/6/USERLOGOUT`

## 14. Troubleshooting Umum

### 14.1 Web Tidak Bisa Dibuka

Cek:

- apakah service aktif,
- apakah port aplikasi benar,
- apakah IP server yang dibuka benar,
- apakah browser menyimpan cache lama.

Perintah:

```bash
systemctl status manajemen-vpn
journalctl -u manajemen-vpn -n 50 --no-pager
```

### 14.2 Perubahan Password Admin Tidak Terbaca

Penyebab paling umum:

- `.env` sudah diubah tetapi service belum direstart.

Solusi:

```bash
systemctl restart manajemen-vpn
```

Jika browser masih terlihat bisa masuk dengan password lama:

- logout dulu,
- atau tes dari incognito,
- karena cookie login lama bisa masih aktif.

### 14.3 Session Log Tidak Muncul

Hal yang perlu dicek:

- aplikasi sedang hidup saat event login/logout terjadi,
- Huawei benar-benar mengirim syslog ke server,
- listener UDP `514` aktif,
- event yang datang memang `USERLOGINSUCC` atau `USERLOGOUT`.

Cek log service:

```bash
journalctl -u manajemen-vpn -f
```

### 14.4 Waktu Session Terlihat Salah

Yang harus dicek:

- `HUAWEI_SYSLOG_TIMEZONE`
- `APP_TIMEZONE_OFFSET_MINUTES`

Deployment ini memakai:

- header syslog Huawei dibaca sebagai UTC,
- filter operasional aplikasi memakai WITA.

### 14.5 Session Aktif Hilang Setelah App Restart

Ini bisa terjadi pada mode event-based syslog.

Penyebab:

- event login sudah terjadi saat aplikasi mati,
- sehingga aplikasi tidak sempat mencatat session tersebut.

Solusi operasional:

- pastikan service selalu aktif,
- jika perlu, logout lalu login ulang agar event baru masuk,
- atau di masa depan tambahkan mekanisme snapshot session aktif dari firewall.

## 15. Batasan Versi Sekarang

Beberapa hal yang memang belum ada:

- login admin dari database,
- audit log admin,
- rename username dari menu edit,
- disable user terpisah,
- metadata resmi `created_at` untuk akun VPN,
- sumber session dari accounting asli Huawei ke `radacct`.

## 16. Rekomendasi Operasional

Untuk penggunaan harian, saya sarankan pola berikut:

1. Jalankan aplikasi selalu via `systemd`, jangan manual.
2. Setelah ubah frontend, selalu `npm run build` lalu restart service.
3. Setelah ubah `.env`, selalu restart service.
4. Gunakan halaman `User Management` untuk administrasi akun.
5. Gunakan halaman `Session Logs` untuk memantau koneksi aktif dan histori putus koneksi.
6. Jika session tidak muncul, cek log service sebelum menyimpulkan ada bug di UI.

