// ============================================================================
// 🛡️ Rate Limiter Middleware — Sliding Window Counter via Redis
// ============================================================================
//
// Algoritma: Sliding Window Counter
//   → Lebih adil dari Fixed Window (tidak ada "burst" di batas window)
//   → Lebih ringan dari Sliding Window Log (tidak simpan setiap timestamp)
//
// Cara kerja:
//   1. Setiap request → INCR counter di Redis dengan key "rl:{ip}"
//   2. Counter di-expire sesuai windowMs
//   3. Jika counter > max → tolak dengan 429 Too Many Requests
//
// Kenapa Redis, bukan express-rate-limit?
//   → express-rate-limit default pakai in-memory store
//   → Hilang saat container restart
//   → Tidak shared kalau ada 2+ backend containers (scale horizontal)
//   → Redis = single source of truth untuk semua instances
//
// ============================================================================

const { redisClient } = require('../utils/redis');

/**
 * Factory function untuk membuat rate limiter middleware
 *
 * @param {Object} options
 * @param {number} options.windowMs    - Durasi window dalam milidetik (default: 15 menit)
 * @param {number} options.max         - Jumlah request maksimal per window (default: 100)
 * @param {string} options.message     - Pesan error jika rate limit terlampaui
 * @param {string} options.keyPrefix   - Prefix Redis key (untuk membedakan limiter berbeda)
 * @param {boolean} options.skipFailedRequests - Skip counting request yang gagal (status >= 400)
 * @returns {Function} Express middleware
 */
function createRateLimiter({
    windowMs = 15 * 60 * 1000,  // 15 menit default
    max = 100,                   // 100 requests per window
    message = 'Too many requests from this IP, please try again later',
    keyPrefix = 'rl',            // Rate Limit prefix
    skipFailedRequests = false,
} = {}) {
    // Konversi windowMs ke detik untuk Redis EXPIRE
    const windowSec = Math.ceil(windowMs / 1000);

    return async (req, res, next) => {
        // ─── Graceful Degradation ─────────────────────────────────────
        // Jika Redis tidak connected → izinkan request (jangan block user)
        if (!redisClient.isReady) {
            console.warn('⚠️  Rate Limiter: Redis not ready, allowing request');
            return next();
        }

        // ─── Tentukan IP Address ──────────────────────────────────────
        // Di belakang Nginx/ALB, IP asli ada di X-Forwarded-For header
        const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
            || req.socket.remoteAddress
            || 'unknown';

        // Redis key: "rl:general:192.168.1.1" atau "rl:login:192.168.1.1"
        const key = `${keyPrefix}:${ip}`;

        try {
            // ─── Atomic INCR + EXPIRE ─────────────────────────────────
            // INCR: tambah counter (buat key jika belum ada, value = 1)
            // EXPIRE: set TTL hanya jika ini request pertama (counter = 1)
            const currentCount = await redisClient.incr(key);

            if (currentCount === 1) {
                // Request pertama dalam window → set expiry
                await redisClient.expire(key, windowSec);
            }

            // ─── Set Response Headers ─────────────────────────────────
            // Header standar untuk rate limiting (RFC 6585)
            const remaining = Math.max(0, max - currentCount);
            const ttl = await redisClient.ttl(key);

            res.set({
                'X-RateLimit-Limit': max,
                'X-RateLimit-Remaining': remaining,
                'X-RateLimit-Reset': Math.ceil(Date.now() / 1000) + ttl,
            });

            // ─── Check Limit ──────────────────────────────────────────
            if (currentCount > max) {
                return res.status(429).json({
                    status: 'fail',
                    message,
                    data: null,
                    retryAfter: ttl, // Berapa detik lagi bisa retry
                });
            }

            next();
        } catch (err) {
            // Redis error → graceful degradation, izinkan request
            console.error('❌ Rate Limiter Redis error:', err.message);
            next();
        }
    };
}

// ─── Pre-configured Limiters ──────────────────────────────────────────────

/**
 * General API limiter: 100 requests per 15 menit per IP
 * Untuk semua endpoint
 */
const generalLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,  // 15 menit
    max: 100,
    keyPrefix: 'rl:general',
    message: 'Too many requests, please try again in 15 minutes',
});

/**
 * Auth limiter: 10 attempts per 15 menit per IP
 * Khusus untuk /api/auth/login dan /api/auth/register
 * Lebih ketat karena ini target brute force
 */
const authLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,  // 15 menit
    max: 10,
    keyPrefix: 'rl:auth',
    message: 'Too many authentication attempts, please try again in 15 minutes',
});

/**
 * Strict limiter: 5 requests per 1 jam per IP
 * Untuk endpoint sensitif (password reset, dll)
 */
const strictLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000,  // 1 jam
    max: 5,
    keyPrefix: 'rl:strict',
    message: 'Too many attempts, please try again in 1 hour',
});

module.exports = {
    createRateLimiter,
    generalLimiter,
    authLimiter,
    strictLimiter,
};
