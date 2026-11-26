export function errorHandler(err, req, res, next) {
  console.error('API Error:', err);

  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Payload too large' });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }

  const status = err.status || err.statusCode || 500;
  const isProd = process.env.NODE_ENV === 'production';
  const message = status >= 500 && isProd
    ? 'Internal server error'
    : (err.message || 'Internal server error');

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}
