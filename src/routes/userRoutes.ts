import type { Router } from 'express';
import express from 'express';
import { protect, restrictTo } from '../controllers/authController';
import { getAllUsers, getUserById } from '../controllers/userController';

const router: Router = express.Router();

router.use(protect);

// GET all users (cluster_god only)
router.route('/').get(restrictTo('cluster_god'), getAllUsers);

// GET user by :id
router.route('/:id').get(getUserById);

export default router;
