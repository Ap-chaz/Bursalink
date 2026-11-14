import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  registerArea,
  requestAreaChange,
  getAreaRequests,
  reviewAreaRequest,
  getAuditLogs
} from '../controllers/profileController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, getProfile);
router.patch('/', authenticate, updateProfile);
router.post('/area', authenticate, registerArea);
router.post('/area-change', authenticate, requestAreaChange);

// Admin area review & audit routes
router.get('/admin/area-requests', authenticate, requireAdmin, getAreaRequests);
router.patch('/admin/area-requests/:id', authenticate, requireAdmin, reviewAreaRequest);
router.get('/admin/audit', authenticate, requireAdmin, getAuditLogs);

export default router;
