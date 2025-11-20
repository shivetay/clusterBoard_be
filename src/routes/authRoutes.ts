import type { Router } from 'express';
import express from 'express';
import {
  deactivateAccount,
  facebookAuth,
  facebookAuthCallback,
  forgotPassword,
  getCurrentUser,
  googleAuth,
  googleAuthCallback,
  loginJWT,
  loginSession,
  logout,
  registerJWT,
  registerSession,
  resetPassword,
  updatePassword,
} from '../controllers/authController';
import { protectJWT, protectSession } from '../middleware/authMiddleware';

const router: Router = express.Router();

// ============================================
// JWT-based Authentication Routes
// ============================================

// Register with JWT
router.post('/jwt/register', registerJWT);

// Login with JWT
router.post('/jwt/login', loginJWT);

// Get current user (JWT)
router.get('/jwt/me', protectJWT, getCurrentUser);

// Update password (JWT)
router.patch('/jwt/update-password', protectJWT, updatePassword);

// Deactivate account (JWT)
router.delete('/jwt/deactivate', protectJWT, deactivateAccount);

// ============================================
// Session-based Authentication Routes
// ============================================

// Register with Session
router.post('/session/register', registerSession);

// Login with Session
router.post('/session/login', loginSession);

// Logout (Session)
router.post('/session/logout', logout);

// Get current user (Session)
router.get('/session/me', protectSession, getCurrentUser);

// Update password (Session)
router.patch('/session/update-password', protectSession, updatePassword);

// Deactivate account (Session)
router.delete('/session/deactivate', protectSession, deactivateAccount);

// ============================================
// Password Management (works for both)
// ============================================

// Forgot password
router.post('/forgot-password', forgotPassword);

// Reset password
router.patch('/reset-password/:token', resetPassword);

// ============================================
// OAuth Routes (Google)
// ============================================

// Google OAuth - JWT mode
router.get('/google', googleAuth);

// Google OAuth callback
router.get('/google/callback', googleAuthCallback);

// ============================================
// OAuth Routes (Facebook)
// ============================================

// Facebook OAuth - JWT mode
router.get('/facebook', facebookAuth);

// Facebook OAuth callback
router.get('/facebook/callback', facebookAuthCallback);

export default router;
