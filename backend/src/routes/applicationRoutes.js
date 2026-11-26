import { Router } from 'express';
import {
  getApplications,
  getDrafts,
  saveDraft,
  submitApplication,
  withdrawApplication,
  trackApplicationPublic,
  adminListApplications,
  adminUpdateStatus
} from '../controllers/applicationController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { trackLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Public application tracker (No login required - enter reference number e.g. BL-2026-000001)
router.get('/track/:ref', trackLimiter, trackApplicationPublic);

// Student authenticated application routes
router.get('/', authenticate, getApplications);
router.get('/drafts', authenticate, getDrafts);
router.post('/drafts', authenticate, saveDraft);
router.post('/', authenticate, submitApplication);
router.post('/:ref/withdraw', authenticate, withdrawApplication);

// Admin review routes
router.get('/admin/all', authenticate, requireAdmin, adminListApplications);
router.patch('/admin/:id/status', authenticate, requireAdmin, adminUpdateStatus);

export default router;
