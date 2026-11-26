import app from './app.js';
import dotenv from 'dotenv';
import { authSecret } from './config/security.js';

dotenv.config();

// Fail fast: refuse to start in production without a strong AUTH_SECRET.
authSecret();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Bursalink API Server running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Connected to MySQL port: ${process.env.DB_PORT || 3307}`);
});
