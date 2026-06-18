const request = require('supertest');
const app = require('../app');

// Mock pool untuk simulasi database
jest.mock('pg', () => {
    const mPool = {
        query: jest.fn(),
    };
    return { Pool: jest.fn(() => mPool) };
});

describe('Health Check API (/api/health)', () => {
    let pool;
    beforeAll(() => {
        const { Pool } = require('pg');
        pool = new Pool();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('harus mengembalikan status ok saat database terhubung', async () => {
        // Mock query berhasil
        pool.query.mockResolvedValueOnce({ rows: [{ now: new Date().toISOString() }] });

        const response = await request(app).get('/api/health');

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('ok');
        expect(response.body.service).toBe('api');
        expect(response.body.database).toBe('connected');
    });

    it('harus mengembalikan status error saat database gagal', async () => {
        // Mock query gagal
        pool.query.mockRejectedValueOnce(new Error('Connection refused'));

        const response = await request(app).get('/api/health');

        expect(response.status).toBe(500);
        expect(response.body.status).toBe('error');
        expect(response.body.database).toBe('disconnected');
    });
});
