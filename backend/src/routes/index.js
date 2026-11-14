import { Router } from 'express';
import authRoutes from './authRoutes.js';
import bursaryRoutes from './bursaryRoutes.js';
import profileRoutes from './profileRoutes.js';
import applicationRoutes from './applicationRoutes.js';
import notificationRoutes from './notificationRoutes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/bursaries', bursaryRoutes);
router.use('/profile', profileRoutes);
router.use('/applications', applicationRoutes);
router.use('/notifications', notificationRoutes);

export default router;
