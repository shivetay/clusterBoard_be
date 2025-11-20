import type { Router } from 'express';
import express from 'express';
import { createUser } from '../controllers/authController';
import { getAllUsers, getUserById } from '../controllers/userController';
import { protectJWT, restrictTo } from '../middleware/authMiddleware';

const router: Router = express.Router();

// Protected routes - Admin only
// GET all users (admin only)
router.route('/').get(protectJWT, restrictTo('cluster_god'), getAllUsers);

// POST dummy create user (admin only)
router.route('/create').post(protectJWT, restrictTo('cluster_god'), createUser);

// GET user by :id (authenticated users)
router.route('/:id').get(protectJWT, getUserById);

export default router;
