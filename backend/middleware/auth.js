// ============================================================================
// 🔐 Auth Middleware — JWT Token Verification
// ============================================================================
// Middleware ini memverifikasi JWT token dari header Authorization
// dan meng-attach user data ke req.user
//
// Penggunaan:
//   app.get('/api/protected', authMiddleware, (req, res) => {
//       res.json({ user: req.user });
//   });
// ============================================================================

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

/**
 * Middleware: Verifikasi JWT dari header Authorization: Bearer <token>
 * Jika valid → req.user = { id, email }
 * Jika invalid → 401 Unauthorized
 */
const authMiddleware = (req, res, next) => {
    // 1. Ambil token dari header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            status: 'fail',
            message: 'Access denied. No token provided.',
            data: null,
        });
    }

    const token = authHeader.split(' ')[1];

    try {
        // 2. Verifikasi token
        const decoded = jwt.verify(token, JWT_SECRET);

        // 3. Attach user ke request object
        req.user = {
            id: decoded.id,
            email: decoded.email,
        };

        next();
    } catch (err) {
        // Token expired atau invalid
        const message = err.name === 'TokenExpiredError'
            ? 'Token has expired. Please login again.'
            : 'Invalid token. Please login again.';

        return res.status(401).json({
            status: 'fail',
            message,
            data: null,
        });
    }
};

/**
 * Helper: Generate JWT token
 * @param {Object} payload - Data yang di-encode (id, email)
 * @param {string} expiresIn - Durasi token (default: 24 jam)
 * @returns {string} JWT token
 */
function generateToken(payload, expiresIn = '24h') {
    return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

module.exports = { authMiddleware, generateToken, JWT_SECRET };
