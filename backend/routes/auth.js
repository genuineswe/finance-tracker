// ============================================================================
// 🔐 Auth Routes — Register, Login, Me
// ============================================================================
//
// Security Features:
//   ✅ bcrypt password hashing (salt rounds = 12)
//   ✅ Account Lockout setelah 5× gagal login (via Redis, 15 menit)
//   ✅ Rate limiting per IP (via authLimiter middleware)
//   ✅ Zod input validation
//   ✅ Timing-safe response (tidak bocorkan apakah email terdaftar)
//   ✅ JWT token (24 jam expiry)
//
// Endpoints:
//   POST /api/auth/register  — Daftar akun baru
//   POST /api/auth/login     — Login (dengan lockout protection)
//   GET  /api/auth/me         — Get current user (protected)
//
// ============================================================================

const express = require('express');
const bcrypt = require('bcrypt');
const { z } = require('zod');
const { redisClient } = require('../utils/redis');
const { authMiddleware, generateToken } = require('../middleware/auth');
const { asyncHandler, ValidationError } = require('../utils/errors');

const router = express.Router();

// ─── Constants ──────────────────────────────────────────────────────────────

/**
 * Bcrypt Salt Rounds: 12
 *
 * Kenapa 12?
 *   - Cost factor = 2^12 = 4096 iterations
 *   - Hashing time: ~250ms di server modern (sweet spot antara security & UX)
 *   - Comparison:
 *       Salt 10 = ~100ms  → minimum acceptable (OWASP)
 *       Salt 12 = ~250ms  → recommended (balance security & performance)
 *       Salt 14 = ~1s     → terlalu lambat untuk UX login
 *       Salt 16 = ~4s     → tidak cocok untuk web app
 *
 * Rule of thumb:
 *   → Pilih salt rounds tertinggi yang masih bisa di-tolerate user (<500ms)
 *   → Naikkan 1-2 level setiap 2-3 tahun (sesuai hukum Moore)
 *   → Jangan pernah di bawah 10
 */
const BCRYPT_SALT_ROUNDS = 12;

/**
 * Account Lockout Config
 *   - MAX_LOGIN_ATTEMPTS: 5 kali gagal → akun terkunci
 *   - LOCKOUT_DURATION_SEC: 15 menit (900 detik) lockout
 *
 * Kenapa 5 attempts / 15 menit?
 *   - 5 cukup untuk typo manusia, tapi terlalu sedikit untuk brute force
 *   - 15 menit = cukup lama untuk menghentikan automated attacks
 *   - Tidak permanent lockout → attacker tidak bisa DoS user lain
 *     (permanent lockout = attacker tinggal spam wrong password → user asli terkunci)
 */
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_SEC = 15 * 60; // 15 menit

// ─── Zod Schemas ────────────────────────────────────────────────────────────

const registerSchema = z.object({
    name: z.string()
        .min(2, 'Name must be at least 2 characters')
        .max(100, 'Name too long'),
    email: z.string()
        .email('Invalid email format')
        .max(255),
    password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .max(72, 'Password too long (bcrypt max 72 bytes)')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number')
        .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});

const loginSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
});

// ─── Helper: Account Lockout via Redis ──────────────────────────────────────

/**
 * Cek apakah akun terkunci (lockout)
 * @param {string} email - Email user
 * @returns {Object} { isLocked, remainingSeconds, attempts }
 */
async function checkLockout(email) {
    if (!redisClient.isReady) {
        // Redis down → skip lockout check (graceful degradation)
        return { isLocked: false, remainingSeconds: 0, attempts: 0 };
    }

    const key = `lockout:${email.toLowerCase()}`;

    try {
        const attempts = parseInt(await redisClient.get(key)) || 0;

        if (attempts >= MAX_LOGIN_ATTEMPTS) {
            const ttl = await redisClient.ttl(key);
            return {
                isLocked: true,
                remainingSeconds: ttl > 0 ? ttl : 0,
                attempts,
            };
        }

        return { isLocked: false, remainingSeconds: 0, attempts };
    } catch (err) {
        console.error('❌ Lockout check error:', err.message);
        return { isLocked: false, remainingSeconds: 0, attempts: 0 };
    }
}

/**
 * Record gagal login (increment counter)
 * @param {string} email - Email user
 * @returns {number} Jumlah percobaan gagal saat ini
 */
async function recordFailedLogin(email) {
    if (!redisClient.isReady) return 0;

    const key = `lockout:${email.toLowerCase()}`;

    try {
        const attempts = await redisClient.incr(key);

        if (attempts === 1) {
            // Pertama kali gagal → set TTL
            await redisClient.expire(key, LOCKOUT_DURATION_SEC);
        }

        return attempts;
    } catch (err) {
        console.error('❌ Record failed login error:', err.message);
        return 0;
    }
}

/**
 * Reset counter setelah login sukses
 * @param {string} email - Email user
 */
async function resetFailedLogins(email) {
    if (!redisClient.isReady) return;

    const key = `lockout:${email.toLowerCase()}`;

    try {
        await redisClient.del(key);
    } catch (err) {
        console.error('❌ Reset failed logins error:', err.message);
    }
}

// ─── Database Reference ─────────────────────────────────────────────────────
// Pool di-pass via app.locals dari app.js (lebih clean dari global variable)
// Diakses via req.app.locals.pool

// ============================================================================
// POST /api/auth/register — Daftar Akun Baru
// ============================================================================
router.post('/register', asyncHandler(async (req, res) => {
    const pool = req.app.locals.pool;

    // 1. Validate input
    const validation = registerSchema.safeParse(req.body);
    if (!validation.success) {
        throw new ValidationError('Validation Failed', validation.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
        })));
    }

    const { name, email, password } = validation.data;

    // 2. Cek apakah email sudah terdaftar
    const existingUser = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
        // Tetap return 409 karena ini bukan login attempt
        // (tidak perlu timing-safe di sini, karena register memang harus tahu apakah email sudah ada)
        return res.status(409).json({
            status: 'fail',
            message: 'Email already registered',
            data: null,
        });
    }

    // 3. Hash password dengan bcrypt
    //    bcrypt.hash(password, saltRounds):
    //      → Otomatis generate random salt
    //      → Salt di-embed di hash string (tidak perlu simpan terpisah)
    //      → Output: "$2b$12$<22-char-salt><31-char-hash>" (60 chars total)
    const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    // 4. Insert ke database
    const result = await pool.query(
        `INSERT INTO users (name, email, password_hash)
         VALUES ($1, $2, $3)
         RETURNING id, name, email, created_at`,
        [name, email.toLowerCase(), hashedPassword]
    );

    const user = result.rows[0];

    // 5. Generate JWT token
    const token = generateToken({ id: user.id, email: user.email });

    // 6. Response (JANGAN return password_hash!)
    res.status(201).json({
        status: 'success',
        message: 'Registration successful',
        data: {
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                created_at: user.created_at,
            },
            token,
        },
    });
}));

// ============================================================================
// POST /api/auth/login — Login dengan Account Lockout
// ============================================================================
router.post('/login', asyncHandler(async (req, res) => {
    const pool = req.app.locals.pool;

    // 1. Validate input
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
        throw new ValidationError('Validation Failed', validation.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
        })));
    }

    const { email, password } = validation.data;
    const normalizedEmail = email.toLowerCase();

    // 2. Cek apakah akun terkunci (Account Lockout)
    const lockout = await checkLockout(normalizedEmail);

    if (lockout.isLocked) {
        const minutes = Math.ceil(lockout.remainingSeconds / 60);
        return res.status(423).json({
            status: 'fail',
            message: `Account is temporarily locked due to ${MAX_LOGIN_ATTEMPTS} failed login attempts. Try again in ${minutes} minute(s).`,
            data: {
                lockedUntil: new Date(Date.now() + lockout.remainingSeconds * 1000).toISOString(),
                remainingSeconds: lockout.remainingSeconds,
            },
        });
    }

    // 3. Cari user di database
    const result = await pool.query(
        'SELECT id, name, email, password_hash FROM users WHERE email = $1',
        [normalizedEmail]
    );

    // ─── TIMING-SAFE RESPONSE ─────────────────────────────────────
    // Jika user tidak ditemukan, tetap jalankan bcrypt.compare dengan dummy hash
    // agar response time sama → attacker tidak bisa tahu apakah email terdaftar
    //
    // Tanpa ini:
    //   Email ada     → response 250ms (karena bcrypt.compare jalan)
    //   Email tidak   → response 1ms   (langsung return error)
    //   → Attacker bisa enumerasi email terdaftar dari response time!
    //
    const user = result.rows[0];
    const dummyHash = '$2b$12$dummyhashfortimingequalitypadding000000000000000000000';
    const hashToCompare = user ? user.password_hash : dummyHash;

    // 4. Bandingkan password
    //    bcrypt.compare() secara otomatis:
    //      → Extract salt dari hash string
    //      → Hash input password dengan salt yang sama
    //      → Bandingkan hasil
    //    Ini constant-time comparison (timing-safe)
    const isPasswordValid = await bcrypt.compare(password, hashToCompare);

    if (!user || !isPasswordValid) {
        // 5a. Login gagal → record failed attempt
        const attempts = await recordFailedLogin(normalizedEmail);
        const remaining = MAX_LOGIN_ATTEMPTS - attempts;

        // Generic message (tidak bocorkan apakah email ada atau password salah)
        return res.status(401).json({
            status: 'fail',
            message: 'Invalid email or password',
            data: remaining > 0
                ? { attemptsRemaining: remaining }
                : { message: `Account locked for ${LOCKOUT_DURATION_SEC / 60} minutes` },
        });
    }

    // 5b. Login sukses → reset failed login counter
    await resetFailedLogins(normalizedEmail);

    // 6. Generate token
    const token = generateToken({ id: user.id, email: user.email });

    // 7. Response
    res.status(200).json({
        status: 'success',
        message: 'Login successful',
        data: {
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
            },
            token,
        },
    });
}));

// ============================================================================
// GET /api/auth/me — Get Current User (Protected)
// ============================================================================
router.get('/me', authMiddleware, asyncHandler(async (req, res) => {
    const pool = req.app.locals.pool;

    const result = await pool.query(
        'SELECT id, name, email, created_at FROM users WHERE id = $1',
        [req.user.id]
    );

    if (result.rows.length === 0) {
        return res.status(404).json({
            status: 'fail',
            message: 'User not found',
            data: null,
        });
    }

    res.status(200).json({
        status: 'success',
        data: { user: result.rows[0] },
    });
}));

module.exports = router;
