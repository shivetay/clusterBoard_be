import type { Router } from 'express';
import express from 'express';
import { createUser } from '../controllers/authController';
import { getAllUsers, getUserById } from '../controllers/userController';

const router: Router = express.Router();

// GET all users
router.route('/').get(getAllUsers);

// POST dummy create user
router.route('/create').post(createUser);

// GET user by :id
router.route('/:id').get(getUserById);

export default router;
