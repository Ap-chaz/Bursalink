import { Router } from 'express';
import { listBursaries, getBursaryById, createBursary, updateBursary } from '../controllers/bursaryController.js';
import { optionalAuthenticate, authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/', optionalAuthenticate, listBursaries);
router.get('/:id', optionalAuthenticate, getBursaryById);
router.post('/', authenticate, requireAdmin, createBursary);
router.put('/:id', authenticate, requireAdmin, updateBursary);

export default router;
