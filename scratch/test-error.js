const { ValidationError } = require('../backend/utils/errors');
const err = new ValidationError('Validation Failed', []);
console.log('statusCode:', err.statusCode);
console.log('status:', err.status);
console.log('message:', err.message);
