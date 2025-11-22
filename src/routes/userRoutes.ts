import type { Router } from 'express';
import express from 'express';
import { getAllUsers, getUserById } from '../controllers/userController';
import { requireAuth } from '../middleware/clerk-auth';
import { requireClusterGod } from '../middleware/role-check';

const router: Router = express.Router();

// GET all users
router.route('/').get(requireAuth, requireClusterGod, getAllUsers);

// GET user by :id
router.route('/:id').get(requireAuth, getUserById);

export default router;
