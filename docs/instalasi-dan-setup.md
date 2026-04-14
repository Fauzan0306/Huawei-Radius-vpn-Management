# Panduan Instalasi dan Setup

Dokumen ini menjelaskan cara menyiapkan project dari server kosong sampai aplikasi dapat dipakai. Panduan ini berasumsi target server berbasis Debian/Ubuntu dan FreeRADIUS 3.x dengan MariaDB.

## 1. Gambaran Umum

Project ini tidak menggantikan fungsi FreeRADIUS. Aplikasi web ini hanya menjadi panel admin dan monitor di atas infrastruktur berikut:

- FreeRADIUS
- MariaDB
- schema SQL RADIUS
- Huawei USG6555F SSL VPN jika mode Huawei dipakai

Alur minimal:

1. install MariaDB
2. install FreeRADIUS + SQL module
3. siapkan database RADIUS
4. aktifkan pencatatan accounting ke `radacct`
5. install aplikasi ini
6. hubungkan `.env` aplikasi ke database yang sama

## 2. Prasyarat

Siapkan:

- Linux server Debian/Ubuntu
- akses `sudo`
- Node.js 18+ dan npm
- MariaDB server
- FreeRADIUS
- akses admin ke perangkat Huawei USG6555F jika ingin mode syslog Huawei

## 3. Install Paket Sistem

Contoh Debian/Ubuntu:

```bash
sudo apt update
sudo apt install -y mariadb-server freeradius freeradius-mysql nodejs npm
```

Jika Node.js dari repo distro terlalu lama, gunakan repository Node.js yang sesuai kebutuhan deployment Anda.

## 4. Buat Database RADIUS

Masuk ke MariaDB:

```bash
sudo mysql
```

Buat database dan user:

```sql
CREATE DATABASE radius CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'radius'@'localhost' IDENTIFIED BY 'ganti-password-aman';
GRANT ALL PRIVILEGES ON radius.* TO 'radius'@'localhost';
FLUSH PRIVILEGES;
```

## 5. Import Schema SQL FreeRADIUS

Project ini membutuhkan tabel standar FreeRADIUS, minimal:

- `radcheck`
- `radreply`
- `radacct`

Path schema default berbeda antar distro. Cek salah satu path berikut:

```bash
ls /etc/freeradius/3.0/mods-config/sql/main/mysql/schema.sql
ls /usr/share/freeradius/config/mods-config/sql/main/mysql/schema.sql
```

Import schema ke database:

```bash
mysql -u radius -p radius < /etc/freeradius/3.0/mods-config/sql/main/mysql/schema.sql
```

Jika path pada server Anda berbeda, sesuaikan dengan file schema yang tersedia.

## 6. Konfigurasi FreeRADIUS SQL Module

Edit module SQL FreeRADIUS. Lokasi yang umum:

```bash
sudo nano /etc/freeradius/3.0/mods-available/sql
```

Pastikan bagian berikut sesuai:

- dialect: `mysql`
- server/port database
- login database
- password database
- radius_db: `radius`

Contoh nilai inti:

```text
dialect = "mysql"
driver = "rlm_sql_${dialect}"

server = "localhost"
port = 3306
login = "radius"
password = "ganti-password-aman"
radius_db = "radius"
```

Aktifkan module SQL:

```bash
sudo ln -s /etc/freeradius/3.0/mods-available/sql /etc/freeradius/3.0/mods-enabled/sql
```

## 7. Pastikan Accounting Masuk ke `radacct`

Aplikasi ini membaca session mode RADIUS dari tabel `radacct`. Karena itu, accounting FreeRADIUS harus aktif dan menggunakan SQL.

Pastikan site/default FreeRADIUS memanggil SQL pada section accounting yang sesuai untuk deployment Anda.

Contoh verifikasi:

```bash
sudo freeradius -X
```

Kemudian lakukan login VPN uji dan pastikan row accounting masuk ke:

```sql
SELECT * FROM radacct ORDER BY radacctid DESC LIMIT 5;
```

## 8. Clone dan Install Project

Clone project:

```bash
git clone https://github.com/Fauzan0306/Huawei-Radius-vpn-Management.git
cd Huawei-Radius-vpn-Management
```

Install dependency:

```bash
npm install
```

## 9. Siapkan File `.env`

Salin template:

```bash
cp .env.example .env
```

Minimal isi:

```env
HOST=0.0.0.0
PORT=3000
CLIENT_URL=http://localhost:5173
JWT_SECRET=ganti-secret-aman
ADMIN_USERNAME=admin
ADMIN_PASSWORD=ganti-password-admin
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=radius
DB_PASSWORD=ganti-password-aman
DB_NAME=radius
SESSION_SOURCE=huawei
```

Lihat referensi lengkap variabel di:

[`docs/konfigurasi-env.md`](./konfigurasi-env.md)

## 10. Menjalankan Development Mode

```bash
npm run dev
```

Default:

- backend: `http://localhost:3000`
- frontend: `http://localhost:5173`

## 11. Menjalankan Production Mode

Build frontend:

```bash
npm run build
```

Jalankan backend:

```bash
npm start
```

Backend akan melayani build frontend dari `client/dist`.

## 12. Setup Systemd

Jika ingin dijalankan sebagai service:

```bash
sudo cp deploy/manajemen-vpn.service /etc/systemd/system/manajemen-vpn.service
sudo systemctl daemon-reload
sudo systemctl enable --now manajemen-vpn
```

Cek status:

```bash
sudo systemctl status manajemen-vpn
```

Lihat log:

```bash
sudo journalctl -u manajemen-vpn -f
```

## 13. Setup Huawei USG6555F Syslog Mode

Jika session akan diambil dari Huawei USG6555F:

```env
SESSION_SOURCE=huawei
SESSION_INGEST_TOKEN=ganti-token-panjang
HUAWEI_SYSLOG_LISTENER_ENABLED=true
HUAWEI_SYSLOG_HOST=0.0.0.0
HUAWEI_SYSLOG_PORT=514
HUAWEI_SYSLOG_TIMEZONE=+00:00
```

Pastikan perangkat Huawei mengirim syslog SSL VPN ke server aplikasi ini pada UDP port yang sesuai.

Event yang dipakai aplikasi:

- `%%01SSLVPN/6/USERLOGINSUCC`
- `%%01SSLVPN/6/USERLOGOUT`

Catatan:

- tabel `vpn_sessions` akan dibuat otomatis oleh aplikasi
- mode ini tidak bergantung pada `radacct` untuk histori Huawei

## 14. Verifikasi Setelah Install

Checklist dasar:

- endpoint health merespons:

```bash
curl http://127.0.0.1:3000/api/health
```

- login admin berhasil
- user dari `radcheck` muncul di halaman user management
- `Filter-Id` bisa dibaca dari `radreply`
- session dari `radacct` atau `vpn_sessions` muncul di dashboard

## 15. Troubleshooting Singkat

### Aplikasi bisa dibuka tetapi data user kosong

Periksa:

- koneksi database di `.env`
- apakah tabel `radcheck` dan `radreply` memang ada
- apakah user MariaDB punya hak akses

### Session log kosong di mode RADIUS

Periksa:

- accounting FreeRADIUS masuk ke `radacct`
- `SESSION_SOURCE=radius`

### Session log kosong di mode Huawei

Periksa:

- `SESSION_SOURCE=huawei`
- listener syslog aktif
- port UDP tidak diblok
- Huawei USG6555F benar-benar mengirim event SSL VPN

### Login admin gagal

Periksa:

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD` atau `ADMIN_PASSWORD_HASH`
- service sudah direstart setelah `.env` diubah

## 16. Catatan Penting

- Jangan commit file `.env`
- Gunakan `.env.example` sebagai template
- Untuk deployment publik, gunakan password admin hash jika memungkinkan
- Jika token GitHub pernah terekspos, revoke dan buat token baru
