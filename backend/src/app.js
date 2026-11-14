import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import routes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { globalLimiter } from './middleware/rateLimiter.js';

const app = express();

// 1. HTTP Security Headers (Hide express, prevent sniffing & clickjacking)
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// 2. CORS Hardening
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS policy'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// 3. Strict Payload Limits (Denial of Service mitigation)
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// 4. Secure Cookie Parser for HttpOnly Session Cookies
app.use(cookieParser());

// 4. Rate Limiting Protection for all API endpoints
app.use('/api', globalLimiter);

// 5. Root & Health Check - Strictly Minimal (Zero Information Disclosure)
app.get('/', (req, res) => {
  res.status(200).json({ status: 'operational' });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// 6. Mount API routes
app.use('/api', routes);

// 7. Generic 404 handler (Prevents endpoint enumeration / reconnaissance)
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// 8. Central error handler (Sanitizes stack traces in production)
app.use(errorHandler);

export default app;
