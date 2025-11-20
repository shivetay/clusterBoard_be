import type { Router } from 'express';
import express from 'express';
import {
  forgotPassword,
  login,
  loginWithFacebook,
  loginWithGoogle,
  logout,
  protect,
  register,
  resetPassword,
  updatePassword,
} from '../controllers/authController';

const router: Router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);

router.post('/forgot-password', forgotPassword);
router.patch('/reset-password/:token', resetPassword);

router.post('/social/google', loginWithGoogle);
router.post('/social/facebook', loginWithFacebook);

router.patch('/update-password', protect, updatePassword);

export default router;
