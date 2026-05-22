# ☁️ AWS Fundamentals untuk Finance Tracker

> [!IMPORTANT]
> Guide ini dirancang untuk developer yang **pertama kali** menggunakan AWS.
> Stack: **Express.js + PostgreSQL + React (Next.js)** — resource budget ~1.6GB RAM (dari Production Docker Setup).

---

## 📚 Bagian 1: Konsep Dasar

### 1.1 Apa Itu AWS Region?

**Analogi:** Bayangkan AWS seperti jaringan **mall raksasa** di seluruh dunia. Setiap mall ada di kota berbeda — Jakarta, Singapura, Tokyo, Virginia. Setiap mall punya toko yang sama (EC2, RDS, S3), tapi **stoknya independen**. Kalau mall Jakarta kebakaran, mall Singapura tetap buka.

**Definisi Teknis:** Region = lokasi geografis fisik di mana AWS mengoperasikan data center.

| Region Code | Lokasi | Jarak dari Indonesia |
|-------------|--------|---------------------|
| `ap-southeast-1` | Singapore | ~1,000 km ⭐ |
| `ap-southeast-3` | Jakarta | ~0 km ⭐⭐ |
| `ap-northeast-1` | Tokyo | ~5,500 km |
| `us-east-1` | Virginia, USA | ~16,000 km |

**Kapan Digunakan:**
- ✅ Pilih region **terdekat dengan user** → latency rendah
- ✅ Perhatikan **harga** — setiap region punya pricing berbeda
- ✅ Cek **service availability** — tidak semua service ada di semua region

**Untuk Finance Tracker:**
```
Rekomendasi: ap-southeast-1 (Singapore)
Alasan:
  1. Dekat dengan Indonesia → latency ~20-30ms
  2. Free Tier tersedia penuh
  3. Semua service yang kita butuhkan ada (EC2, RDS, S3, ALB)
  4. ap-southeast-3 (Jakarta) lebih dekat, tapi pricing bisa lebih mahal
     dan beberapa service belum tersedia
```

> [!TIP]
> **Rule of thumb:** Untuk proyek awal, pilih `ap-southeast-1` (Singapore). Migrasi region nanti bisa dilakukan, tapi lebih mudah mulai di region yang lengkap.

---

### 1.2 Apa Itu Availability Zone (AZ)?

**Analogi:** Kalau Region = mall, maka **AZ = gedung terpisah dalam satu kompleks mall**. Mall Singapore punya 3 gedung (AZ): `ap-southeast-1a`, `1b`, `1c`. Setiap gedung punya listrik, AC, dan lift sendiri. Kalau gedung A mati lampu, gedung B dan C tetap beroperasi.

**Definisi Teknis:** AZ = satu atau lebih data center fisik yang terpisah dalam satu Region, dengan power, cooling, dan networking independen.

```
Region: ap-southeast-1 (Singapore)
├── AZ: ap-southeast-1a  ← Data Center cluster 1
├── AZ: ap-southeast-1b  ← Data Center cluster 2 (10-100km jauhnya)
└── AZ: ap-southeast-1c  ← Data Center cluster 3
    
Koneksi antar AZ: <2ms latency (fiber optic dedicated)
```

**Kapan Digunakan:**
| Skenario | Jumlah AZ | Contoh |
|----------|-----------|--------|
| Development/testing | 1 AZ cukup | EC2 di `1a` saja |
| Production kecil | 2 AZ minimum | RDS Multi-AZ |
| Production serius | 3 AZ | ECS + ALB spread across 3 AZ |

**Untuk Finance Tracker (awal):**
```
Tahap 1 (sekarang — Free Tier):
  EC2        → 1 AZ (ap-southeast-1a) ← cukup untuk mulai
  RDS        → 1 AZ (Single-AZ)      ← Free Tier hanya Single-AZ

Tahap 2 (setelah ada user):
  RDS        → Multi-AZ              ← auto-failover jika 1 AZ mati
  ALB        → 2+ AZ                 ← load balancer butuh min 2 AZ
```

> [!WARNING]
> **Common Pitfall:** Jangan deploy semua resource di 1 AZ untuk production. Kalau AZ itu down (jarang tapi pernah terjadi), **semua** service kamu ikut mati.

---

### 1.3 Apa Itu IAM (Identity and Access Management)?

**Analogi:** IAM = **sistem kartu akses gedung kantor**.

```
Root Account     = Pemilik gedung. Punya master key untuk SEMUA ruangan.
                   Jarang dipakai, disimpan di brankas.

IAM User         = Karyawan dengan ID card. Setiap orang punya akses
                   berbeda: developer bisa masuk ruang server,
                   marketing hanya bisa masuk ruang meeting.

IAM Role         = Seragam/vest sementara. "Siapapun yang pakai vest
                   kuning boleh masuk gudang." EC2 instance bisa
                   "pakai vest" (assume role) untuk akses S3.

IAM Policy       = Daftar ruangan yang boleh dimasuki.
                   Tertulis: "Boleh baca S3 bucket X, tidak boleh hapus."

IAM Group        = Divisi/department. Semua orang di divisi "Backend"
                   otomatis dapat akses yang sama.
```

**Komponen IAM:**

```
┌─────────────────────────────────────────────┐
│              AWS Account (Root)              │
│                                             │
│  ┌─── Group: Developers ──────────────┐     │
│  │  Policy: EC2FullAccess             │     │
│  │  Policy: RDSReadOnly              │     │
│  │                                    │     │
│  │  👤 IAM User: andre-dev           │     │
│  │  👤 IAM User: teammate            │     │
│  └────────────────────────────────────┘     │
│                                             │
│  🎭 Role: EC2-S3-Access                    │
│     Policy: S3ReadWrite                     │
│     (di-attach ke EC2 instance)             │
│                                             │
│  🎭 Role: CI-CD-Deploy                     │
│     Policy: ECS Deploy + ECR Push           │
│     (dipakai oleh Jenkins/GitHub Actions)   │
└─────────────────────────────────────────────┘
```

**Prinsip Utama: Least Privilege (Hak Akses Minimum)**
```
❌ SALAH:  Kasih AdministratorAccess ke semua orang
✅ BENAR:  Kasih akses secukupnya — developer dapat EC2+RDS,
           CI/CD hanya dapat deploy permission
```

---

## 🛠️ Bagian 2: Step-by-Step Tutorial (Free Tier)

> [!CAUTION]
> **Sebelum mulai:** Siapkan email baru khusus AWS + kartu kredit/debit (diperlukan untuk verifikasi, TIDAK akan di-charge jika tetap di Free Tier). Pantau billing secara berkala!

### Step 1: Buat AWS Account

```
1. Buka https://aws.amazon.com/free/
2. Klik "Create a Free Account"
3. Isi:
   - Email: gunakan email BARU (bukan email personal utama)
   - Account name: "finance-tracker-prod" (atau nama project kamu)
4. Verifikasi email
5. Isi payment info (kartu kredit/debit)
6. Pilih "Basic Support — Free"
7. Selesai! Kamu sekarang punya ROOT account.
```

> [!WARNING]
> **JANGAN gunakan root account untuk kerja sehari-hari!** Root account = master key. Lanjut ke Step 2 untuk membuat IAM user.

### Step 2: Amankan Root Account

```
1. Login ke AWS Console sebagai Root
2. Buka: IAM → Dashboard (search "IAM" di search bar)
3. Klik nama akun di pojok kanan atas → "Security credentials"
4. Aktifkan MFA (Multi-Factor Authentication):
   a. Klik "Assign MFA device"
   b. Pilih "Authenticator app"
   c. Scan QR code dengan Google Authenticator / Authy
   d. Masukkan 2 kode berturut-turut
   e. Klik "Assign MFA"
5. JANGAN buat access key untuk root!
```

**Verifikasi:** Setelah MFA aktif, kamu akan lihat ✅ di sebelah "MFA" pada Security Credentials page.

### Step 3: Buat IAM User untuk Kerja Sehari-hari

```
1. Di IAM Dashboard, klik "Users" di sidebar kiri
2. Klik "Create user"
3. User name: "andre-admin" (atau nama kamu)
4. Centang ✅ "Provide user access to the AWS Management Console"
5. Pilih "I want to create an IAM user"
6. Custom password → buat password yang kuat
7. Uncheck "Users must create a new password at next sign-in"
8. Klik "Next"
```

### Step 4: Buat IAM Group & Attach Policy

```
Di halaman "Set permissions" (lanjutan Step 3):

1. Pilih "Add user to group"
2. Klik "Create group"
3. Group name: "Administrators"
4. Cari dan centang policy: "AdministratorAccess"
   ⚠️ Ini untuk AWAL saja — nanti kita akan buat custom policy
5. Klik "Create user group"
6. Pastikan group "Administrators" tercentang
7. Klik "Next" → "Create user"
```

**Catat info login IAM User:**
```
Console sign-in URL: https://<ACCOUNT-ID>.signin.aws.amazon.com/console
Username: andre-admin
Password: (yang kamu buat tadi)
```

> [!TIP]
> Bookmark URL sign-in IAM! URL ini berbeda dari root login. Format: `https://ACCOUNT_ID.signin.aws.amazon.com/console`

### Step 5: Aktifkan MFA untuk IAM User

```
1. LOGOUT dari Root account
2. LOGIN dengan IAM User (menggunakan URL sign-in IAM)
3. Buka IAM → Users → klik nama user kamu
4. Tab "Security credentials"
5. Assign MFA device (sama seperti Step 2)
```

### Step 6: Setup Billing Alerts

```
1. Buka: Billing → Budgets (search "Budgets" di search bar)
2. Klik "Create budget"
3. Pilih "Zero spend budget" (alert jika ada charge > $0)
   - Budget name: "zero-spend-alert"
   - Email: masukkan email kamu
4. Klik "Create budget"

ATAU untuk budget kustom:
1. Pilih "Monthly cost budget"
2. Budget amount: $5 (atau sesuai toleransi kamu)
3. Set alert threshold: 80% ($4)
4. Masukkan email notification
```

> [!IMPORTANT]
> **Setup billing alert SEBELUM membuat resource apapun.** Ini adalah safety net paling penting di AWS. Tanpa ini, kamu bisa tiba-tiba kena tagihan ratusan dollar.

### Step 7: Pilih Region

```
1. Di AWS Console (pojok kanan atas), klik dropdown Region
2. Pilih: Asia Pacific (Singapore) — ap-southeast-1
3. Semua resource yang kamu buat akan ada di region ini
```

> [!NOTE]
> Beberapa service seperti IAM, Route 53, dan CloudFront bersifat **global** (tidak terikat region). Tapi EC2, RDS, S3 bersifat **regional**.

### Step 8: Buat Custom IAM Policy untuk Finance Tracker

Setelah setup awal selesai, buat policy yang lebih ketat:

```
1. Buka IAM → Policies → "Create policy"
2. Pilih tab "JSON"
3. Paste policy berikut:
```

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "EC2Management",
      "Effect": "Allow",
      "Action": [
        "ec2:Describe*",
        "ec2:RunInstances",
        "ec2:StartInstances",
        "ec2:StopInstances",
        "ec2:TerminateInstances",
        "ec2:CreateSecurityGroup",
        "ec2:AuthorizeSecurityGroupIngress",
        "ec2:RevokeSecurityGroupIngress",
        "ec2:CreateKeyPair",
        "ec2:CreateTags"
      ],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "aws:RequestedRegion": "ap-southeast-1"
        }
      }
    },
    {
      "Sid": "RDSManagement",
      "Effect": "Allow",
      "Action": [
        "rds:Describe*",
        "rds:CreateDBInstance",
        "rds:ModifyDBInstance",
        "rds:CreateDBSubnetGroup"
      ],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "aws:RequestedRegion": "ap-southeast-1"
        }
      }
    },
    {
      "Sid": "BillingReadOnly",
      "Effect": "Allow",
      "Action": [
        "aws-portal:ViewBilling",
        "budgets:ViewBudget",
        "ce:GetCostAndUsage"
      ],
      "Resource": "*"
    }
  ]
}
```

```
4. Policy name: "FinanceTrackerDeveloper"
5. Klik "Create policy"

Lalu buat group baru:
6. IAM → Groups → Create group: "FinanceTrackerDevs"
7. Attach policy: "FinanceTrackerDeveloper"
8. Pindahkan IAM user kamu dari "Administrators" ke "FinanceTrackerDevs"
```

> [!NOTE]
> Policy di atas membatasi akses **hanya ke region Singapore** dan **hanya service yang dibutuhkan**. Ini mencegah pembuatan resource di region lain secara tidak sengaja.

---

## 🏆 Bagian 3: Best Practices & Common Pitfalls

### ✅ Best Practices

| # | Practice | Detail |
|---|----------|--------|
| 1 | **MFA di mana-mana** | Root + semua IAM user harus punya MFA |
| 2 | **Jangan pakai root** | Login root hanya untuk: ubah billing, tutup akun |
| 3 | **Billing alerts** | Set $0 alert + budget bulanan |
| 4 | **1 region untuk mulai** | Jangan spread resource ke banyak region |
| 5 | **Tag semua resource** | `Project: finance-tracker`, `Environment: dev` |
| 6 | **Gunakan IAM Roles untuk EC2** | Jangan hardcode AWS credentials di app |
| 7 | **Rotate access keys** | Jika pakai CLI, rotate setiap 90 hari |
| 8 | **Enable CloudTrail** | Audit log siapa melakukan apa (gratis 90 hari) |

### ❌ Common Pitfalls

| # | Pitfall | Apa yang Terjadi | Solusi |
|---|---------|-------------------|--------|
| 1 | **Lupa matikan resource** | Tagihan EC2/RDS jalan terus | Set billing alert + biasakan `Stop` instance setelah selesai |
| 2 | **Elastic IP tanpa instance** | Dicharge ~$3.6/bulan | Release EIP jika tidak dipakai |
| 3 | **RDS Multi-AZ di Free Tier** | Bukan Free Tier! Double charge | Pastikan pilih **Single-AZ** untuk Free Tier |
| 4 | **Hardcode credentials** | `.env` berisi AWS key di-push ke GitHub → hacked | Gunakan IAM Role, bukan access key |
| 5 | **Security Group 0.0.0.0/0** | Port 22 (SSH) terbuka ke seluruh dunia | Batasi SSH ke IP kamu saja |
| 6 | **Pakai us-east-1 "karena default"** | Latency tinggi dari Indonesia (~200ms) | Pilih ap-southeast-1 |
| 7 | **Buat resource, lupa region mana** | Resource "hilang" — sebenarnya di region lain | Selalu cek region di navbar |
| 8 | **Root access key** | Kompromi total jika bocor | JANGAN pernah buat root access key |

### 🏷️ Tagging Strategy untuk Finance Tracker

Selalu tag setiap resource yang kamu buat:

```
Key: Project        Value: finance-tracker
Key: Environment    Value: dev | staging | prod
Key: Owner          Value: andre
Key: CostCenter     Value: personal
```

**Kenapa penting?**
- Filter resource berdasarkan project di console
- Track biaya per project di Cost Explorer
- Automasi shutdown/startup berdasarkan tag

---

## 🔍 Bagian 4: Security Review Checklist

Setelah kamu selesai setup, kirim screenshot/info berikut agar saya bisa review:

### Checklist yang Perlu Kamu Verifikasi

```
□ 1. Root account MFA aktif?
     → IAM Dashboard → "Root account MFA" harus hijau ✅

□ 2. IAM user dibuat & MFA aktif?
     → IAM → Users → klik user → Security credentials → MFA assigned

□ 3. Tidak ada Root access key?
     → Security credentials → Access keys → harus kosong

□ 4. Billing alert aktif?
     → Budgets → harus ada minimal 1 budget

□ 5. Region sudah Singapore?
     → Pojok kanan atas harus menunjukkan "Singapore"

□ 6. Password policy diperketat?
     → IAM → Account settings → Password policy:
        - Minimum 14 characters
        - Require uppercase, lowercase, numbers, symbols
        - Enable password expiration (90 days)

□ 7. CloudTrail aktif?
     → CloudTrail → Trails → minimal 1 trail aktif
     (biasanya auto-created sebagai "management events" trail)
```

### Kirimkan ke Saya

Setelah semua checklist di atas selesai, beritahu saya dan saya akan:

1. **Review konfigurasi IAM** — apakah policy sudah least-privilege
2. **Cek Security Group** — jika sudah buat EC2
3. **Validasi networking** — VPC, subnet, route table
4. **Rekomendasi arsitektur** untuk deploy Finance Tracker

---

## 🗺️ Roadmap: Dari Sini ke Deploy

Setelah fondasi AWS ini selesai, langkah selanjutnya:

```
Week 1 (SEKARANG):
  ✅ AWS Account + IAM + Billing     ← Guide ini

Week 2:
  📦 VPC + Security Groups + EC2
     → Deploy Docker ke EC2 t3.small
     → Gunakan docker-compose.prod.yml yang sudah siap

Week 3:
  🗄️ RDS PostgreSQL (Free Tier: db.t3.micro)
     → Migrasi dari Docker PostgreSQL ke managed RDS
     → Automatic backups

Week 4:
  🌐 Domain + SSL + ALB
     → Route 53 untuk DNS
     → ACM untuk free SSL certificate
     → ALB untuk HTTPS termination

Future:
  🚀 ECS/Fargate (opsional upgrade dari EC2)
  📊 CloudWatch monitoring
  🔐 Secrets Manager untuk credentials
```

---

> [!TIP]
> **Ingat:** Kamu sudah punya production Docker setup yang solid (resource limits, health checks, non-root user). AWS deployment akan **jauh lebih smooth** karena fondasi Docker sudah benar. Resource limit ~1.6GB dari compose file langsung mapping ke t3.small (2GB RAM, ~$15/bulan).
