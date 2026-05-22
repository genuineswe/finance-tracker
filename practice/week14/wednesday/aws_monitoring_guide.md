# Panduan Setup AWS Monitoring Dasar

Selamat atas deployment aplikasi Finance Tracker Anda ke AWS EC2! Setup monitoring dan alarm adalah langkah yang sangat krusial di awal agar Anda bisa tidur nyenyak tanpa khawatir tagihan membengkak.

Berikut adalah panduan *step-by-step* yang dirancang berurutan (kita mulai dari membuat sistem notifikasinya terlebih dahulu agar bisa langsung dipakai oleh alarm).

---

### Langkah 1: Setup SNS (Notifikasi via Email)
Sebelum membuat alarm, kita butuh "saluran pengumuman" agar AWS tahu ke mana harus mengirim peringatan.

1. Buka **AWS Management Console** dan cari layanan **SNS** (Simple Notification Service).
2. Di menu kiri, pilih **Topics** lalu klik tombol **Create topic**.
3. Di bagian *Details*:
   - Type: Pilih **Standard** (jangan yang FIFO).
   - Name: Ketik `AWS-Alerts-Topic` (atau nama lain bebas).
   - Scroll ke bawah dan klik **Create topic**.
4. Setelah Topic dibuat, di halaman tersebut, klik tombol **Create subscription**.
5. Di bagian *Details*:
   - Protocol: Pilih **Email**.
   - Endpoint: Masukkan alamat email Anda.
   - Klik **Create subscription**.
6. **SANGAT PENTING**: Buka inbox email Anda. Anda akan menerima email dari AWS Notifications. Klik link **Confirm subscription** di dalam email tersebut agar AWS bisa mulai mengirimkan notifikasi.

---

### Langkah 2: Buat Billing Alarm (Peringatan Jika > $10)
Sebelum membuat alarm, Anda harus mengaktifkan fiturnya di halaman *Billing*.

**A. Mengaktifkan Fitur Billing Alert:**
1. Di sudut kanan atas console AWS, klik nama akun Anda dan pilih **Billing and Cost Management**.
2. Di menu kiri bawah, cari bagian **Preferences** lalu pilih **Billing preferences**.
3. Cari bagian **Alert preferences**, klik Edit.
4. Centang **Receive CloudWatch Billing Alerts**, lalu Save.

**B. Membuat Alarm:**
1. Cari layanan **CloudWatch** di kotak pencarian AWS.
2. Di menu kiri, buka **Alarms** -> pilih **Billing**.
3. Klik tombol **Create alarm**.
4. Klik **Select metric**. Di tab *Browse*, pilih **Billing** -> **Total Estimated Charge**.
5. Centang baris mata uang `USD`, lalu klik tombol **Select metric** di pojok kanan bawah.
6. Pada bagian *Conditions*:
   - Threshold type: **Static**
   - Whenever EstimatedCharges is... : **Greater/Equal (>=)**
   - than... : Ketik **10**
   - Klik Next.
7. Pada bagian *Configure actions*:
   - Send a notification to the following SNS topic: Pilih **Select an existing SNS topic**.
   - Send notification to: Pilih `AWS-Alerts-Topic` yang kita buat di Langkah 1.
   - Klik Next.
8. Beri nama alarm, misal: `Billing-Alarm-10USD`. Klik Next, review, dan klik **Create alarm**.

---

### Langkah 3: Buat Alarm CPU Utilization EC2
Ini berguna untuk memberi tahu Anda jika ada *traffic spike* atau aplikasi Anda *hang* dan memakan CPU terus-menerus.

1. Tetap di layanan **CloudWatch**, buka **Alarms** -> **All alarms**.
2. Klik **Create alarm** -> **Select metric**.
3. Pilih **EC2** -> **Per-Instance Metrics**.
4. Di kolom *Search*, ketik nama atau ID instance EC2 Anda. Centang baris yang *Metric Name*-nya adalah **CPUUtilization**. Klik **Select metric**.
5. Pada bagian *Conditions*:
   - Threshold type: **Static**
   - Whenever CPUUtilization is... : **Greater/Equal (>=)**
   - than... : Ketik **80** (artinya 80% pemakaian CPU).
   - Di bagian *Additional configuration*, ubah *Datapoints to alarm* menjadi **2 out of 2**. (Artinya: peringatan akan dikirim jika CPU > 80% selama minimal 10 menit berturut-turut, bukan karena lonjakan sesaat).
   - Klik Next.
6. Pada bagian *Configure actions*, pilih kembali SNS topic `AWS-Alerts-Topic`. Klik Next.
7. Beri nama alarm, misal: `EC2-High-CPU-Alarm`. Klik Next, review, dan klik **Create alarm**.

---

### Langkah 4: Membuat Dashboard Monitoring EC2 Sederhana
Agar tidak perlu mencari-cari metrik setiap kali buka AWS, kita kumpulkan di satu halaman.

1. Di menu kiri **CloudWatch**, pilih **Dashboards** -> klik **Create dashboard**.
2. Beri nama, misal: `Finance-Tracker-Health`.
3. Anda akan diminta menambahkan *Widget*. Pilih **Line** -> **Metrics** -> lalu pilih **EC2** -> **Per-Instance Metrics**.
4. Centang metrik berikut untuk instance Anda:
   - `CPUUtilization` (Untuk melihat beban kerja)
   - `NetworkIn` dan `NetworkOut` (Untuk melihat traffic masuk/keluar)
5. Klik **Create widget**.
6. Klik lagi tombol **+** (Add widget) di dashboard:
   - Kali ini pilih tipe **Number** -> **Metrics** -> **EC2** -> **Per-Instance Metrics**.
   - Centang `StatusCheckFailed`. (Ini sangat penting! Jika nilainya 1, berarti ada hardware/jaringan EC2 yang bermasalah dari sisi AWS).
   - Klik Create widget.
7. **PENTING**: Klik tombol **Save** di pojok kanan atas dashboard agar susunan Anda tidak hilang.

---

### Langkah 5: Waspadai Batas AWS Free Tier ⚠️
Berikut adalah jebakan umum *Free Tier* (berlaku 12 bulan pertama) yang sering membuat tagihan jebol:

1. **Batas Jam EC2 (750 jam/bulan):**
   - Anda mendapatkan gratis 750 jam/bulan untuk instance tipe `t2.micro` atau `t3.micro`.
   - 750 jam = 31 hari nonstop. Artinya, **hanya aman untuk 1 instance**. Jika Anda menjalankan 2 instance `t2.micro` secara bersamaan, jatah gratis akan habis di pertengahan bulan dan Anda akan dikenakan biaya.
2. **Kapasitas Storage EBS (30 GB):**
   - Anda mendapat batas gratis hard disk (EBS) sebesar 30 GB. Jika saat membuat EC2 Anda mengalokasikan storage lebih dari 30 GB, Anda akan langsung ditagih selisihnya.
3. **Elastic IP (IP Publik Statis):**
   - Elastic IP **GRATIS** asalkan di-*attach* ke instance EC2 yang sedang **MENYALA (Running)**.
   - *Jebakan*: Jika Anda mematikan (*Stop*) instance EC2 tersebut, AWS justru akan **menagih biaya sewa** untuk Elastic IP yang menganggur. Jadi, kalau Anda punya Elastic IP yang tidak terpakai, segera hapus (*Release*).
4. **Data Transfer (Outbound 100 GB/bulan):**
   - Traffic *masuk* (Inbound) ke AWS selalu gratis.
   - Traffic *keluar* (Outbound) ke internet gratis hingga 100 GB per bulan. Untuk aplikasi *finance tracker* pribadi, ini lebih dari cukup.
5. **CloudWatch Alarms:**
   - Free Tier memberikan 10 custom metrics dan 10 alarm gratis. Karena kita baru membuat 2 alarm, Anda masih sangat aman.
