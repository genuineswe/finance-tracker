const {
    AppError,
    ValidationError,
    NotFoundError,
    DatabaseError,
} = require('../utils/errors');

describe('Error Classes', () => {
    it('AppError creates a basic error', () => {
        const err = new AppError('Basic Error', 401);
        expect(err.message).toBe('Basic Error');
        expect(err.statusCode).toBe(401);
        expect(err.status).toBe('fail');
        expect(err.isOperational).toBe(true);
    });

    it('AppError sets status to error for 500', () => {
        const err = new AppError('Server Error', 500);
        expect(err.status).toBe('error');
    });

    it('ValidationError creates a 400 error', () => {
        const errors = [{ field: 'test', message: 'invalid' }];
        const err = new ValidationError('Invalid', errors);
        expect(err.statusCode).toBe(400);
        expect(err.errors).toBe(errors);
        expect(err.status).toBe('fail');
    });

    it('NotFoundError creates a 404 error', () => {
        const err = new NotFoundError();
        expect(err.statusCode).toBe(404);
        expect(err.message).toBe('Resource not found');
    });

    it('DatabaseError creates a 500 error', () => {
        const err = new DatabaseError();
        expect(err.statusCode).toBe(500);
        expect(err.message).toBe('Internal database error');
    });
});
