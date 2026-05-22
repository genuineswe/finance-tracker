# 🔐 Security Implementation — Rate Limiting, Account Lockout, Password Hashing

## Ringkasan

Tiga fitur security telah diimplementasikan di Finance Tracker backend:

| Fitur | Teknologi | File |
|-------|-----------|------|
| Rate Limiting per IP | Redis + Sliding Window Counter | [rateLimiter.js](file:///Users/andrel/finance-tracker/backend/middleware/rateLimiter.js) |
| Account Lockout (5× gagal) | Redis + TTL Counter | [auth.js (routes)](file:///Users/andrel/finance-tracker/backend/routes/auth.js) |
| Password Hashing | bcrypt (salt rounds 12) | [auth.js (routes)](file:///Users/andrel/finance-tracker/backend/routes/auth.js) |

### File Baru

| File | Fungsi |
|------|--------|
| [utils/redis.js](file:///Users/andrel/finance-tracker/backend/utils/redis.js) | Redis client + reconnection strategy |
| [middleware/rateLimiter.js](file:///Users/andrel/finance-tracker/backend/middleware/rateLimiter.js) | Rate limiter factory + 3 pre-configured tiers |
| [middleware/auth.js](file:///Users/andrel/finance-tracker/backend/middleware/auth.js) | JWT verification middleware + token generator |
| [routes/auth.js](file:///Users/andrel/finance-tracker/backend/routes/auth.js) | Register, Login (dengan lockout), Get Me |

### File Dimodifikasi

| File | Perubahan |
|------|-----------|
| [app.js](file:///Users/andrel/finance-tracker/backend/app.js) | +Redis init, +rate limiter, +auth routes, +users table |
| [docker-compose.yml](file:///Users/andrel/finance-tracker/docker-compose.yml) | +Redis service, +REDIS_URL & JWT_SECRET env |
| [package.json](file:///Users/andrel/finance-tracker/backend/package.json) | +bcrypt, +jsonwebtoken, +redis, +helmet |
| [.env](file:///Users/andrel/finance-tracker/.env) | +REDIS_URL, +JWT_SECRET |
| [.env.example](file:///Users/andrel/finance-tracker/.env.example) | +REDIS_URL, +JWT_SECRET sections |

---

## 1. Rate Limiting per IP (Redis)

### Arsitektur

```mermaid
sequenceDiagram
    participant Client
    participant Express
    participant Redis
    participant Handler

    Client->>Express: GET /api/transactions
    Express->>Redis: INCR "rl:general:192.168.1.1"
    Redis-->>Express: count = 42

    alt count <= 100
        Express->>Handler: Process request
        Handler-->>Client: 200 OK + X-RateLimit headers
    else count > 100
        Express-->>Client: 429 Too Many Requests
    end
```

### 3 Tier Rate Limiting

| Tier | Key Prefix | Max Requests | Window | Dipakai di |
|------|-----------|-------------|--------|-----------|
| **General** | `rl:general:{ip}` | 100 | 15 menit | Semua `/api/*` routes |
| **Auth** | `rl:auth:{ip}` | 10 | 15 menit | `/api/auth/login`, `/api/auth/register` |
| **Strict** | `rl:strict:{ip}` | 5 | 1 jam | Password reset (future) |

### Response Headers (RFC 6585)

```
X-RateLimit-Limit: 100          ← Max requests per window
X-RateLimit-Remaining: 58       ← Sisa request
X-RateLimit-Reset: 1715420000   ← Unix timestamp kapan window reset
```

### Graceful Degradation

```
Redis UP   → Rate limiting aktif (normal)
Redis DOWN → Semua request diizinkan (log warning)
                ↳ Kenapa? Lebih baik app tanpa rate limit
                  daripada app tidak bisa dipakai sama sekali
```

---

## 2. Account Lockout

### Flow

```mermaid
flowchart TD
    A["POST /api/auth/login"] --> B{"Cek Redis:\nlockout:{email}"}
    B -->|"attempts >= 5"| C["423 Locked\n'Try again in X minutes'"]
    B -->|"attempts < 5"| D{"Cek credentials"}
    D -->|"Invalid"| E["INCR lockout:{email}\nSet TTL 15 menit"]
    E --> F["401 Unauthorized\n'N attempts remaining'"]
    D -->|"Valid"| G["DEL lockout:{email}\nReset counter"]
    G --> H["200 OK + JWT Token"]

    style C fill:#ff6b6b,color:#fff
    style F fill:#ffa94d,color:#fff
    style H fill:#51cf66,color:#fff
```

### Kenapa 5 Attempts / 15 Menit?

```
Brute Force Math:
  → Password 8 chars (a-z,A-Z,0-9,symbols) = ~6 quadrillion combinations
  → 5 attempts / 15 menit = 20 attempts/jam = 480/hari
  → Butuh ~34 TRILIUN TAHUN untuk brute force

  Tanpa lockout (1000 req/sec):
  → Butuh ~190 RIBU TAHUN
  → Masih mustahil, tapi lockout tambah layer defense + alert system
```

### Kenapa BUKAN Permanent Lockout?

> [!WARNING]
> **Permanent lockout = Denial of Service vulnerability!**
>
> Attacker tinggal kirim 5× wrong password ke akun korban → akun terkunci selamanya.
> Korban harus contact admin untuk unlock. Bayangkan 1000 user terkena.
>
> Temporary lockout (15 menit) = attacker hanya bisa delay login, bukan block permanently.

---

## 3. Password Hashing (bcrypt)

### Kenapa bcrypt?

| Algoritma | Cocok? | Alasan |
|-----------|--------|--------|
| ❌ MD5 / SHA-256 | Tidak | Terlalu cepat (~1 MILIAR hash/detik di GPU) |
| ❌ SHA-512 + salt | Tidak | Masih terlalu cepat (~500 juta/detik) |
| ✅ **bcrypt** | Ya | **Intentionally slow** (~4 hash/detik di salt 12) + built-in salt |
| ✅ Argon2 | Ya | Lebih baru, tapi bcrypt sudah battle-tested 25+ tahun |
| ✅ scrypt | Ya | Juga bagus, tapi bcrypt lebih widely supported |

### Salt Rounds Benchmark

```
Salt 10 = 2^10 =    1,024 iterations → ~100ms  → Minimum OWASP
Salt 12 = 2^12 =    4,096 iterations → ~250ms  → ✅ KITA PAKAI INI
Salt 14 = 2^14 =   16,384 iterations → ~1s     → Terlalu lambat untuk login
Salt 16 = 2^16 =   65,536 iterations → ~4s     → Tidak cocok web app
```

### Anatomy Hash bcrypt

```
$2b$12$LJ3m4iKwG/qEm6v1C4HdaeGOLH7K.pKQECP.JV1yjkbYZmO.uXNLK
 │   │  │                              │
 │   │  └── 22-char Salt (random)      └── 31-char Hash
 │   └── Cost Factor (12 = 2^12 iterations)
 └── Algorithm version (2b = current)

Keuntungan: Salt + Hash + Algorithm = 1 string
           → Tidak perlu kolom terpisah untuk salt
```

### Kenapa Max 72 Bytes?

> [!CAUTION]
> bcrypt **silently truncates** password di atas 72 bytes!
>
> ```
> "A".repeat(72) + "B"  → hash sama dengan "A".repeat(72)
> ```
>
> Solusi: Validasi di Zod schema → `.max(72, 'Password too long (bcrypt max 72 bytes)')`

### Timing-Safe Login Response

```javascript
// ❌ BURUK — bocorkan apakah email terdaftar
const user = await findUser(email);
if (!user) return res.status(401).json({ message: 'Email not found' });     // ~1ms
const valid = await bcrypt.compare(password, user.password_hash);            // ~250ms
// Attacker bisa tahu: response 1ms = email tidak ada, response 250ms = email ada

// ✅ BAGUS — response time selalu sama (~250ms)
const user = await findUser(email);
const dummyHash = '$2b$12$dummy...';
const hashToCompare = user ? user.password_hash : dummyHash;
const valid = await bcrypt.compare(password, hashToCompare);                 // Selalu ~250ms
if (!user || !valid) return res.status(401).json({ message: 'Invalid email or password' });
```

---

## 4. Auth API Endpoints

### POST /api/auth/register

```bash
curl -X POST http://localhost:3011/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Andre L",
    "email": "andre@example.com",
    "password": "MyStr0ng!Pass"
  }'
```

```json
{
  "status": "success",
  "message": "Registration successful",
  "data": {
    "user": { "id": 1, "name": "Andre L", "email": "andre@example.com" },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

**Password Requirements** (Zod validation):
- Min 8 characters, max 72 (bcrypt limit)
- At least 1 uppercase, 1 lowercase, 1 number, 1 special char

### POST /api/auth/login

```bash
# Normal login
curl -X POST http://localhost:3011/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{ "email": "andre@example.com", "password": "MyStr0ng!Pass" }'
```

**Responses:**

````carousel
```json
// ✅ 200 — Login Successful
{
  "status": "success",
  "data": {
    "user": { "id": 1, "name": "Andre L", "email": "andre@example.com" },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```
<!-- slide -->
```json
// ❌ 401 — Wrong Credentials (4 attempts remaining)
{
  "status": "fail",
  "message": "Invalid email or password",
  "data": { "attemptsRemaining": 4 }
}
```
<!-- slide -->
```json
// 🔒 423 — Account Locked
{
  "status": "fail",
  "message": "Account is temporarily locked due to 5 failed login attempts. Try again in 15 minute(s).",
  "data": {
    "lockedUntil": "2026-05-11T13:40:00.000Z",
    "remainingSeconds": 892
  }
}
```
````

### GET /api/auth/me (Protected)

```bash
curl http://localhost:3011/api/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

## 5. Infrastruktur: Redis di Docker Compose

```yaml
# docker-compose.yml (sudah ditambahkan)
redis:
  image: redis:7-alpine
  container_name: redis_cache
  volumes:
    - redis_data:/data
  command: redis-server --appendonly yes --maxmemory 64mb --maxmemory-policy allkeys-lru
  networks:
    - db_network
```

| Config | Nilai | Alasan |
|--------|-------|--------|
| `--appendonly yes` | Persist to disk | Data rate limit survive restart |
| `--maxmemory 64mb` | Max 64MB RAM | Cukup untuk ~1 juta rate limit keys |
| `--maxmemory-policy allkeys-lru` | Evict least recently used | Otomatis hapus key lama jika penuh |

---

## ⚡ Install & Test

```bash
# 1. Install dependencies baru
cd backend && npm install

# 2. Start semua services (termasuk Redis baru)
cd .. && docker-compose up -d --build

# 3. Test register
curl -X POST http://localhost:3011/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@test.com","password":"MyStr0ng!Pass"}'

# 4. Test login (sukses)
curl -X POST http://localhost:3011/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"MyStr0ng!Pass"}'

# 5. Test lockout (spam 6× wrong password)
for i in {1..6}; do
  curl -s -X POST http://localhost:3011/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}' | jq .
done

# 6. Check rate limit headers
curl -v http://localhost:3011/api/health 2>&1 | grep -i x-ratelimit
```
