// ============================================================================
// 🔴 Redis Client — Koneksi ke Redis untuk Rate Limiting & Account Lockout
// ============================================================================
// Redis digunakan karena:
//   1. Atomic operations (INCR, EXPIRE) → race-condition safe
//   2. TTL built-in → data expired otomatis (tidak perlu cleanup manual)
//   3. In-memory → ~0.1ms per operation (vs ~5ms PostgreSQL)
//
// Kenapa tidak pakai memory biasa (Map/Object)?
//   → Hilang saat restart container
//   → Tidak shared antar instance jika scale horizontal
// ============================================================================

const { createClient } = require('redis');

// Redis URL dari env, fallback ke default Docker service name
const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379';

const redisClient = createClient({
    url: REDIS_URL,
    socket: {
        // Reconnect strategy: exponential backoff, max 10 detik
        reconnectStrategy: (retries) => {
            if (retries > 20) {
                console.error('❌ Redis: Too many reconnect attempts, giving up');
                return new Error('Redis reconnect limit reached');
            }
            const delay = Math.min(retries * 500, 10000);
            console.log(`🔄 Redis: Reconnecting in ${delay}ms (attempt ${retries})...`);
            return delay;
        },
    },
});

// Event listeners untuk monitoring
redisClient.on('connect', () => console.log('🔴 Redis: Connecting...'));
redisClient.on('ready', () => console.log('✅ Redis: Connected and ready'));
redisClient.on('error', (err) => console.error('❌ Redis Error:', err.message));
redisClient.on('reconnecting', () => console.log('🔄 Redis: Reconnecting...'));

/**
 * Inisialisasi koneksi Redis.
 * Dipanggil saat app startup di app.js
 */
async function connectRedis() {
    try {
        await redisClient.connect();
    } catch (err) {
        console.error('❌ Redis: Initial connection failed:', err.message);
        // Tidak throw error → app tetap bisa jalan tanpa Redis (graceful degradation)
        // Rate limiting akan fallback ke "allow all" jika Redis down
    }
}

module.exports = { redisClient, connectRedis };
