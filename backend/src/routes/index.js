import { Router } from 'express';
import authRoutes from './authRoutes.js';
import bursaryRoutes from './bursaryRoutes.js';
import profileRoutes from './profileRoutes.js';
import applicationRoutes from './applicationRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import uploadRoutes from './uploadRoutes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/bursaries', bursaryRoutes);
router.use('/profile', profileRoutes);
router.use('/applications', applicationRoutes);
router.use('/notifications', notificationRoutes);
router.use('/upload', uploadRoutes);

export default router;
