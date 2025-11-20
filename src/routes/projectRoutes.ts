import type { Router } from 'express';
import express from 'express';
import {
  changeProjectStatus,
  createProject,
  deleteProject,
  getAllProjects,
  getAllUserProjects,
  getProjectById,
  updateProject,
} from '../controllers/projectController';
import {
  optionalAuth,
  protectJWT,
  restrictTo,
} from '../middleware/authMiddleware';

const router: Router = express.Router();

// Public routes (no auth required, but user info available if authenticated)
// GET all projects (optionally authenticated)
router.route('/').get(optionalAuth, getAllProjects);

// GET project by :id (optionally authenticated)
router.route('/:id').get(optionalAuth, getProjectById);

// GET all projects for a user (optionally authenticated)
router.route('/user/:id').get(optionalAuth, getAllUserProjects);

// Protected routes (authentication required)
// Use protectJWT for JWT-based auth or protectSession for session-based auth
// You can choose which one based on your needs or create separate routes for each

// POST create project (JWT protected)
router.route('/create').post(protectJWT, createProject);

// PATCH update project (JWT protected, only owner or admin)
router.route('/:id').patch(protectJWT, updateProject);

// DELETE project (JWT protected, only owner or admin)
router
  .route('/:id')
  .delete(
    protectJWT,
    restrictTo('cluster_owner', 'cluster_god'),
    deleteProject,
  );

// PATCH status change (JWT protected)
router.route('/:id/status').patch(protectJWT, changeProjectStatus);

export default router;
