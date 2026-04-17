// ============================================
// 🚀 Node.js Express API Server
// ============================================
// Connects to PostgreSQL and provides REST API endpoints
// for the React frontend.

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const { z } = require('zod');
const {
    asyncHandler,
    NotFoundError,
    ValidationError,
} = require('./utils/errors');
const { logError } = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ───
// app.use(cors());               // Izinkan React (port 3010) panggil API (port 5000)
app.use(cors({
    origin: ['http://localhost:3010'], // Masukkan URL frontend (Next.js) Anda
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true // Wajib jika API Anda menggunakan cookies/session
}));
app.use(express.json());       // Parse JSON request body

// ─── Database Connection ───
// Koneksi ke PostgreSQL menggunakan environment variables dari docker-compose.yml
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
});

// ─── Initialize Database ───
// Buat tabel 'users' kalau belum ada (auto-migration sederhana)
// ─── Initialize Database ─── (Update di backend/app.js)
async function initDB() {
    try {
        // 1. Buat Tabel Categories dulu
        await pool.query(`
          CREATE TABLE IF NOT EXISTS categories (
            id SERIAL PRIMARY KEY,
            name VARCHAR(50) UNIQUE NOT NULL
          )
        `);

        // 2. Buat Tabel Transactions
        await pool.query(`
          CREATE TABLE IF NOT EXISTS transactions (
            id SERIAL PRIMARY KEY,
            amount DECIMAL(12,2) NOT NULL,
            description TEXT NOT NULL,
            category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
            date DATE DEFAULT CURRENT_DATE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // 3. Masukkan kategori default jika kosong
        const { rows } = await pool.query('SELECT COUNT(*) FROM categories');
        if (parseInt(rows[0].count) === 0) {
            await pool.query(`
                INSERT INTO categories (name) VALUES 
                ('Gaji'), ('Makanan'), ('Transportasi'), ('Hiburan'), ('Lainnya')
            `);
            console.log('📦 Default categories inserted');
        }

        console.log('✅ Database initialized: Tables transactions & categories created.');
    } catch (err) {
        console.error('❌ Database initialization failed:', err.message);
        setTimeout(initDB, 3000); // Retry jika gagal
    }
}


// ─── API Routes ───

// Health check — untuk cek apakah API hidup
app.get('/api/health', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.json({
            status: 'ok',
            service: 'api',
            database: 'connected',
            timestamp: result.rows[0].now,
        });
    } catch (err) {
        res.status(500).json({
            status: 'error',
            database: 'disconnected',
            error: err.message,
        });
    }
});

// Zod Schema untuk transaksi
const transactionSchema = z.object({
    amount: z.number({ required_error: "Amount is required" }).positive("Amount must be positive"),
    description: z.string().min(3, "Description too short").max(255),
    category_id: z.number().int().positive(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD")
});

// ============================================================================
// CRUD ENDPOINTS (Refactored with asyncHandler)
// ============================================================================

// POST /api/transactions — Create
app.post('/api/transactions', asyncHandler(async (req, res) => {
    // Validate Body
    const validation = transactionSchema.safeParse(req.body);
    if (!validation.success) {
        throw new ValidationError('Validation Failed', validation.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
        })));
    }

    const { amount, description, category_id, date } = validation.data;

    const query = `
    INSERT INTO transactions (amount, description, category_id, date)
    VALUES ($1, $2, $3, $4)
    RETURNING *;
  `;
    const result = await pool.query(query, [amount, description, category_id, date]);

    res.status(201).json({
        status: 'success',
        message: 'Transaction created successfully',
        data: result.rows[0]
    });
}));

// GET /api/transactions — Read All with Filtering, Sorting, and Pagination
app.get('/api/transactions', asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 10,
        category,
        startDate,
        endDate,
        minAmount,
        maxAmount,
        search,
        sort = 'date',
        order = 'desc'
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    // 1. Build Dynamic WHERE Clause
    const conditions = [];
    const values = [];

    if (category) {
        conditions.push(`c.name = $${values.length + 1}`);
        values.push(category);
    }

    if (startDate) {
        conditions.push(`t.date >= $${values.length + 1}`);
        values.push(startDate);
    }

    if (endDate) {
        conditions.push(`t.date <= $${values.length + 1}`);
        values.push(endDate);
    }

    if (minAmount) {
        conditions.push(`t.amount >= $${values.length + 1}`);
        values.push(parseFloat(minAmount));
    }

    if (maxAmount) {
        conditions.push(`t.amount <= $${values.length + 1}`);
        values.push(parseFloat(maxAmount));
    }

    if (search) {
        conditions.push(`t.description ILIKE $${values.length + 1}`);
        values.push(`%${search}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 2. Get Total Count for Pagination
    const countQuery = `
    SELECT COUNT(*) 
    FROM transactions t 
    JOIN categories c ON t.category_id = c.id 
    ${whereClause}
  `;
    const countResult = await pool.query(countQuery, values);
    const totalItems = parseInt(countResult.rows[0].count);

    // 3. Handle Sorting (Whitelisting to prevent SQL Injection)
    const allowedSortColumns = ['date', 'amount', 'description', 'category_name'];
    const sortMapping = {
        'date': 't.date',
        'amount': 't.amount',
        'description': 't.description',
        'category_name': 'c.name'
    };

    const sortColumn = allowedSortColumns.includes(sort) ? sortMapping[sort] : 't.date';
    const sortOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    // 4. Fetch Paginated Data
    const queryValues = [...values, limitNum, offset];
    const dataQuery = `
    SELECT t.*, c.name as category_name
    FROM transactions t
    JOIN categories c ON t.category_id = c.id
    ${whereClause}
    ORDER BY ${sortColumn} ${sortOrder}
    LIMIT $${values.length + 1} OFFSET $${values.length + 2}
  `;

    const result = await pool.query(dataQuery, queryValues);

    // 5. Build Response
    res.status(200).json({
        status: 'success',
        data: result.rows,
        pagination: {
            total: totalItems,
            totalPages: Math.ceil(totalItems / limitNum),
            page: pageNum,
            limit: limitNum
        }
    });
}));

// GET /api/transactions/:id — Read One
app.get('/api/transactions/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Basic numeric check for ID if it's supposed to be an integer
    if (isNaN(id)) {
        throw new ValidationError('Invalid ID format', [{ field: 'id', message: 'ID must be a number' }]);
    }

    const query = `
    SELECT t.*, c.name as category_name
    FROM transactions t
    JOIN categories c ON t.category_id = c.id
    WHERE t.id = $1;
  `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
        throw new NotFoundError(`Transaction with ID ${id} not found`);
    }

    res.status(200).json({
        status: 'success',
        data: result.rows[0]
    });
}));

// PUT /api/transactions/:id — Full Update
app.put('/api/transactions/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (isNaN(id)) throw new ValidationError('Invalid ID format', [{ field: 'id', message: 'ID must be a number' }]);

    const validation = transactionSchema.safeParse(req.body);
    if (!validation.success) {
        throw new ValidationError('Validation Failed', validation.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
        })));
    }

    const { amount, description, category_id, date } = validation.data;

    const query = `
    UPDATE transactions 
    SET amount=$1, description=$2, category_id=$3, date=$4, updated_at=NOW() 
    WHERE id=$5 
    RETURNING *;
  `;
    const result = await pool.query(query, [amount, description, category_id, date, id]);

    if (result.rows.length === 0) {
        throw new NotFoundError(`Transaction with ID ${id} not found`);
    }

    res.json({
        status: 'success',
        message: 'Transaction updated successfully',
        data: result.rows[0]
    });
}));

// DELETE /api/transactions/:id — Delete
app.delete('/api/transactions/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (isNaN(id)) throw new ValidationError('Invalid ID format', [{ field: 'id', message: 'ID must be a number' }]);

    const query = 'DELETE FROM transactions WHERE id=$1 RETURNING *;';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
        throw new NotFoundError(`Transaction with ID ${id} not found`);
    }

    res.status(200).json({
        status: 'success',
        message: 'Transaction deleted successfully'
    }); // Note: Changed from 204 to 200 to return an informative message
}));

// ============================================================================
// CENTRALIZED ERROR HANDLING MIDDLEWARE
// ============================================================================
app.use((err, req, res, next) => {
    // 1. Log the error for internal tracking
    logError(err, req);

    // 2. Set defaults
    let statusCode = err.statusCode || 500;
    let status = err.status || 'error';
    let message = err.message || 'Internal Server Error';
    let errors = err.errors || undefined;

    // 3. Handle Specific Error Types

    // Database Errors (Postgres Specific)
    if (err.code && (err.code.startsWith('08') || err.code === 'ECONNREFUSED')) {
        statusCode = 503;
        message = 'Database connection failed';
    } else if (err.code === '23505') {
        statusCode = 409;
        message = 'Duplicate entry - resource already exists';
    } else if (err.code === '23503') {
        statusCode = 400;
        message = 'Foreign key violation - referenced resource missing';
    }

    // Final Response Format: {status, message, data, errors}
    res.status(statusCode).json({
        status,
        message,
        data: null,
        errors: errors || null,
        // stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    initDB();
});
