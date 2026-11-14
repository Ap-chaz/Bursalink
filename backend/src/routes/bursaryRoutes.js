import { Router } from 'express';
import { listBursaries, getBursaryById, createBursary, updateBursary } from '../controllers/bursaryController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/', listBursaries);
router.get('/:id', getBursaryById);
router.post('/', authenticate, requireAdmin, createBursary);
router.put('/:id', authenticate, requireAdmin, updateBursary);

export default router;
