const request = require('supertest');
const app = require('../app');

describe('Budget Planner API (/api/budget/allocate)', () => {
    let csrfCookie;
    let csrfToken;

    // Sebelum test dijalankan, kita perlu fetch CSRF token
    // untuk melewati middleware keamanan pada endpoint POST
    beforeAll(async () => {
        const res = await request(app).get('/api/csrf-token');
        csrfToken = res.body.csrfToken;
        
        // Ambil header set-cookie yang dilempar oleh API
        const cookies = res.headers['set-cookie'];
        csrfCookie = cookies.find(c => c.startsWith('XSRF-TOKEN=')).split(';')[0];
    });

    it('harus mengembalikan alokasi 50/30/20 yang benar saat diberikan income valid', async () => {
        const payload = { income: 10000000 }; // 10 Juta Rupiah
        
        const response = await request(app)
            .post('/api/budget/allocate')
            .set('Cookie', csrfCookie) // Set cookie CSRF
            .set('x-csrf-token', csrfToken) // Set header CSRF
            .send(payload)
            .set('Accept', 'application/json');

        // Ekspektasi respons sukses (200)
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('success');
        
        // Memastikan hasil perhitungan sesuai 50/30/20
        const { allocation } = response.body.data;
        expect(allocation.needs.amount).toBe(5000000);   // 50% = 5 Juta
        expect(allocation.wants.amount).toBe(3000000);   // 30% = 3 Juta
        expect(allocation.savings.amount).toBe(2000000); // 20% = 2 Juta
    });

    it('harus mengembalikan error validasi jika payload income tidak dikirim', async () => {
        const response = await request(app)
            .post('/api/budget/allocate')
            .set('Cookie', csrfCookie)
            .set('x-csrf-token', csrfToken)
            .send({}) // Payload Kosong
            .set('Accept', 'application/json');

        // Ekspektasi error 400 Bad Request (Error Zod)
        expect(response.status).toBe(400); 
        expect(response.body.status).toBe('error');
        expect(response.body.errors).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    field: 'income',
                    message: 'Income is required'
                })
            ])
        );
    });

    it('harus mengembalikan error validasi jika income bernilai minus (negatif)', async () => {
        const payload = { income: -5000 };
        
        const response = await request(app)
            .post('/api/budget/allocate')
            .set('Cookie', csrfCookie)
            .set('x-csrf-token', csrfToken)
            .send(payload)
            .set('Accept', 'application/json');

        // Ekspektasi error 400
        expect(response.status).toBe(400);
        expect(response.body.errors).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    field: 'income',
                    message: 'Income must be positive'
                })
            ])
        );
    });
});
