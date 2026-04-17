const logError = (err, req) => {
  const timestamp = new Date().toISOString();
  const { method, originalUrl } = req;
  const statusCode = err.statusCode || 500;
  
  console.error(`
[${timestamp}] ${method} ${originalUrl} - ${statusCode}
Message: ${err.message}
Stack: ${err.stack}
  `);
};

module.exports = { logError };
