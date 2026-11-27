import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { uploadLimiter } from '../middleware/rateLimiter.js';
import { uploadSingleDoc } from '../middleware/upload.js';
import { uploadDocument, deleteDocument } from '../controllers/uploadController.js';

const router = Router();

// Upload document (PDF, JPG, PNG, WebP up to 5 MB) to Cloudinary
router.post('/doc', authenticate, uploadLimiter, uploadSingleDoc('file'), uploadDocument);

// Delete document from Cloudinary (owner or admin)
router.delete('/', authenticate, deleteDocument);

export default router;
