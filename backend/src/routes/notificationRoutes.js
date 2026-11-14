import { Router } from 'express';
import {
  listNotifications,
  markRead,
  markAllRead,
  getSaved,
  toggleSave
} from '../controllers/notificationController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, listNotifications);
router.post('/mark-all-read', authenticate, markAllRead);
router.post('/:id/read', authenticate, markRead);

// Saved bursaries bookmarks
router.get('/saved', authenticate, getSaved);
router.post('/saved/:id/toggle', authenticate, toggleSave);

export default router;
