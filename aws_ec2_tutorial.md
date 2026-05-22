# Panduan Amazon EC2 untuk Pemula (Finance Tracker)

### 1. Konsep Dasar: Apa itu Amazon EC2?
**Analogi:** Bayangkan Amazon EC2 (Elastic Compute Cloud) itu seperti **menyewa laptop kosongan di warnet**. Bedanya, "laptop" ini ada di *cloud* (server fisik AWS di Singapura/Jakarta), hidup 24/7, dan memiliki koneksi internet super cepat. 
- **Elastic:** Berarti "elastis". Jika `Finance Tracker` Anda viral, Anda bisa mengubah spesifikasi laptop ini (misal dari RAM 1GB menjadi 16GB) hanya dengan beberapa klik.
- **Kenapa dibutuhkan:** Agar aplikasi Anda tidak hanya berjalan di `localhost` laptop Mac Anda. Anda butuh tempat yang selalu online untuk menaruh backend (Express.js), frontend (React), dan database (PostgreSQL).
- **Kapan digunakan:** Saat Anda membutuhkan kontrol penuh (bisa menginstall sistem operasi, custom software, Docker, Node.js) yang tidak bisa dilakukan oleh layanan hosting biasa.

---

### 2. Step-by-Step Tutorial (AWS Free Tier)

Silakan buka AWS Console Anda dan mari kita mulai.

#### Langkah 1: Launch Instance (Membuat Server)
1. Di AWS Console, cari **EC2** di kolom pencarian atas dan klik.
2. Klik tombol warna oranye **Launch instance**.
3. **Name and tags:** Beri nama, misalnya `finance-tracker-prod`.
4. **Application and OS Images (AMI):** Pilih **Ubuntu**. Pastikan versi yang terpilih adalah `Ubuntu 24.04 LTS` atau `22.04 LTS` dan ada label **Free tier eligible**.
5. **Instance type:** Pilih **`t3.small`** (RAM 2GB, ~$15/bulan).
   > ⚠️ **Kenapa bukan `t2.micro` (Free Tier)?** Stack Docker production Finance Tracker membutuhkan ~1.6GB RAM (512MB backend + 512MB frontend + 512MB database + 128MB nginx). Instance `t2.micro` hanya punya 1GB RAM — kontainer akan kehabisan memori (OOM kill) dan crash berulang kali. Jika Anda ingin **belajar dulu** tanpa Docker (hanya SSH dan eksplorasi), `t2.micro` Free Tier cukup. Tapi untuk **deploy aplikasi**, gunakan minimal `t3.small`.
6. **Key pair (login):** Ini sangat penting! 
   - Klik **Create new key pair**.
   - Name: `finance-tracker-key`
   - Type: `RSA`
   - Format: `.pem` (karena Anda menggunakan Mac).
   - Klik **Create**. File `finance-tracker-key.pem` akan otomatis terdownload ke Mac Anda. *Ini adalah "kunci gembok" fisik ke server Anda.*
7. **Network settings:**
   - Ceklis **Allow SSH traffic from**, dan ubah dropdown dari *Anywhere* menjadi **My IP**. *(Sangat penting untuk keamanan!)*
   - Ceklis **Allow HTTP traffic from the internet**.
   - Ceklis **Allow HTTPS traffic from the internet**.
   > **Note:** Jika muncul peringatan: *"Aturan dengan sumber 0.0.0.0/0 memungkinkan semua alamat IP mengakses instans Anda..."*, **abaikan saja dan jangan khawatir**. Peringatan ini normal karena kita memang sengaja membuka port HTTP/HTTPS untuk publik (`0.0.0.0/0`) agar website bisa diakses oleh siapa saja. Yang terpenting, akses SSH Anda sudah dibatasi ke **My IP**.
8. **Configure storage:** Free tier memberikan Anda SSD gratis hingga 30GB. Anda bisa ubah dari default `8 GiB` menjadi `20 GiB` atau `30 GiB` (pilih tipe `gp3` agar lebih cepat dan murah).
9. Klik tombol oranye **Launch instance** di pojok kanan bawah.

#### Langkah 2: SSH Access (Remote Masuk ke Server)
Buka aplikasi **Terminal** di Mac Anda. Kita akan menghubungkan Mac Anda ke dalam server Ubuntu yang baru dibuat.

1. Pindahkan file `.pem` yang baru didownload ke folder tersembunyi SSH agar rapi:
   ```bash
   mv ~/Downloads/finance-tracker-key.pem ~/.ssh/
   ```
2. **Kunci file tersebut.** (MacOS akan menolak koneksi jika file kunci ini bisa dibaca/diedit oleh sembarang aplikasi):
   ```bash
   chmod 400 ~/.ssh/finance-tracker-key.pem
   ```
3. Kembali ke AWS Console, klik Instance Anda, lalu cari **Public IPv4 address** (misal: `13.250.x.x`).
4. Login ke server menggunakan perintah ini:
   ```bash
   ssh -i ~/.ssh/finance-tracker-key.pem ubuntu@<IP_ADDRESS_EC2_ANDA>
   ```
   *(Jika muncul peringatan "Are you sure you want to continue connecting?", ketik `yes` lalu Enter).*
   **Selamat!** Sekarang terminal Mac Anda sudah berada di dalam server AWS.

#### Langkah 3: Install Node.js (Opsional)
Karena aplikasi Finance Tracker berjalan di dalam kontainer Docker, Node.js **tidak wajib** diinstall di host server. Namun, berguna untuk debugging atau menjalankan script secara langsung.

1. Perbarui daftar paket di server Ubuntu Anda:
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```
2. Install NVM:
   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
   ```
3. Muat ulang konfigurasi terminal agar NVM langsung bisa dipakai:
   ```bash
   source ~/.bashrc
   ```
4. Install Node.js (kita gunakan versi 20 LTS):
   ```bash
   nvm install 20
   ```
5. Verifikasi instalasi:
   ```bash
   node -v
   npm -v
   ```

#### Langkah 4: Install Docker & Docker Compose
Docker adalah fondasi deployment Finance Tracker. Seluruh stack (Nginx, Express, Next.js, PostgreSQL, Redis) berjalan di dalam kontainer Docker.

1. Install Docker dan plugin Docker Compose v2:
   ```bash
   sudo apt install docker.io docker-compose-v2 -y
   ```
2. Aktifkan Docker agar otomatis berjalan saat server restart:
   ```bash
   sudo systemctl start docker
   sudo systemctl enable docker
   ```
3. Izinkan user `ubuntu` menjalankan Docker tanpa `sudo`:
   ```bash
   sudo usermod -aG docker ubuntu
   newgrp docker
   ```
4. Verifikasi instalasi:
   ```bash
   docker --version
   docker compose version
   ```
   Pastikan keduanya mengembalikan nomor versi tanpa error.

#### Langkah 5: Clone Source Code ke Server
Pindahkan file proyek `finance-tracker` ke dalam server EC2.

**Opsi A — Git Clone (Direkomendasikan):**
```bash
git clone <URL_REPOSITORY_GITHUB_ANDA>
cd finance-tracker
```

**Opsi B — Transfer dari Mac via SCP:**
Jalankan perintah ini di **Terminal Mac lokal** (bukan di server):
```bash
scp -r -i ~/.ssh/finance-tracker-key.pem /Users/andrel/finance-tracker ubuntu@<IP_ADDRESS_EC2_ANDA>:~/
```
Lalu kembali ke SSH server dan masuk ke folder:
```bash
cd ~/finance-tracker
```

#### Langkah 6: Siapkan Environment Variables Production
1. Salin template environment production:
   ```bash
   cp .env.production.example .env.production
   ```
2. Edit file menggunakan editor `nano`:
   ```bash
   nano .env.production
   ```
3. **Ganti semua default password dan secret!** Gunakan perintah ini untuk generate password yang kuat:
   ```bash
   openssl rand -base64 32
   ```
4. Simpan dengan `Ctrl+O` → `Enter`, lalu keluar dengan `Ctrl+X`.

> ⚠️ **KRITIS:** Jangan pernah push file `.env.production` ke GitHub. File ini sudah masuk `.gitignore`.

#### Langkah 7: Deploy Aplikasi dengan Docker Compose
1. Jalankan seluruh stack dalam mode production:
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.production up -d --build
   ```
   *Proses build pertama kali bisa memakan waktu 5-10 menit.*

2. Periksa apakah semua kontainer berjalan dan sehat (*healthy*):
   ```bash
   docker compose ps
   ```
   Semua service harus berstatus `Up` dan `(healthy)`.

3. Jika ada error, periksa log:
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f --tail=100
   ```

4. **Tes dari browser:** Buka `http://<IP_ADDRESS_EC2_ANDA>` di browser Mac Anda. Jika muncul halaman Finance Tracker, **selamat — aplikasi Anda sudah live!** 🎉

---

### 3. Best Practices & Common Pitfalls

| ❌ Common Pitfalls (Jangan Dilakukan) | ✅ Best Practices (Lakukan) |
| :--- | :--- |
| **Menghilangkan file `.pem`**<br>AWS *tidak* menyimpan salinan kunci Anda. Jika file `.pem` di Mac Anda hilang/terhapus, Anda tidak akan pernah bisa mengakses server itu lagi. | **Backup kunci `.pem`**<br>Simpan salinannya di Password Manager atau tempat yang sangat aman. |
| **Membuka Port SSH (22) ke `0.0.0.0/0` (Anywhere)**<br>Ini mengundang *bot hacker* dari seluruh dunia untuk mencoba masuk (brute-force) ke server Anda setiap detik. | **Batasi Port SSH hanya ke IP Anda (My IP)**<br>Hanya koneksi dari Wi-Fi / IP Anda saat ini yang boleh masuk. |
| **Buka Tutup EC2 menyebabkan IP Berubah**<br>Jika EC2 di-`Stop` dan di-`Start` lagi, *Public IP*-nya akan berubah, membuat Anda harus mengecek IP baru setiap saat. | **Gunakan Elastic IP**<br>Elastic IP adalah IP statis gratis (selama menempel di EC2 yang sedang berjalan). Buat di menu *Elastic IPs* lalu *Associate* ke EC2 Anda. |
| **Pakai `t2.micro` untuk deploy Docker stack**<br>RAM 1GB tidak cukup untuk stack ~1.6GB → semua kontainer OOM crash. | **Pakai minimal `t3.small` (2GB RAM)**<br>Atau turunkan resource limits di `docker-compose.prod.yml` jika ingin hemat. |
| **Push `.env.production` ke GitHub**<br>Password database dan JWT secret bocor ke publik. | **Pastikan `.env.production` masuk `.gitignore`**<br>Generate secret dengan `openssl rand -base64 32`. |

---

### 4. Tahap Review Keamanan 🕵️‍♂️

**Silakan Anda kerjakan Langkah 1 sampai Langkah 7 di atas secara perlahan.**

Jika sudah selesai (atau jika di tengah jalan Anda mengalami *error* / *Connection Time Out*), silakan lakukan review berikut:
1. Pastikan `docker --version` dan `docker compose version` mengembalikan versi tanpa error.
2. Pastikan `docker compose ps` menampilkan semua service berstatus `Up (healthy)`.
3. Buka menu **Security Groups** di AWS Console, klik *Inbound rules*, lalu pastikan Port 22 (SSH) hanya terbuka untuk `My IP` dan hindari membuka ke `0.0.0.0/0`.
4. Pastikan `http://<IP_ADDRESS_EC2_ANDA>` bisa diakses dari browser.
5. Pastikan file `.env.production` **tidak** ter-push ke repository GitHub Anda.
