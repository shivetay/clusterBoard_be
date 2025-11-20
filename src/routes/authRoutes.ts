import type { Router } from 'express';
import express from 'express';
import {
  facebookAuth,
  forgotPassword,
  googleAuth,
  login,
  logout,
  protect,
  refreshSession,
  register,
  resetPassword,
  updatePassword,
} from '../controllers/authController';

const router: Router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.post('/refresh', protect, refreshSession);

router.post('/password/forgot', forgotPassword);
router.post('/password/reset/:token', resetPassword);
router.post('/password/update', protect, updatePassword);

router.post('/google', googleAuth);
router.post('/facebook', facebookAuth);

export default router;
