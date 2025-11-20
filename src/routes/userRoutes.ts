import type { Router } from 'express';
import express from 'express';
import { protect, restrictTo } from '../controllers/authController';
import { getAllUsers, getUserById } from '../controllers/userController';

const router: Router = express.Router();

// GET all users (protected, only cluster gods can list everyone)
router.route('/').get(protect, restrictTo('cluster_god'), getAllUsers);

// GET user by :id
router.route('/:id').get(protect, getUserById);

export default router;
