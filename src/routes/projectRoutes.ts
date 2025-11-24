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
import { requireAuth } from '../middleware/clerk-auth';
import {
  requireAnyAuthenticated,
  requireClusterGod,
  requireOwnerOrGod,
} from '../middleware/role-check';

const router: Router = express.Router();

// GET all projects
router.route('/').get(requireAuth, requireClusterGod, getAllProjects);

// POST create project
router.route('/create').post(requireAuth, requireOwnerOrGod, createProject);

// GET all projects for a user (owner or investor)
router
  .route('/user/:id')
  .get(requireAuth, requireAnyAuthenticated, getAllUserProjects);

// GET, PATCH, DELETE project by :id
router
  .route('/:id')
  .get(requireAuth, requireAnyAuthenticated, getProjectById)
  .patch(requireAuth, requireOwnerOrGod, updateProject)
  .delete(requireAuth, requireOwnerOrGod, deleteProject);

// PATCH status change
router
  .route('/:id/status')
  .patch(requireAuth, requireOwnerOrGod, changeProjectStatus);
export default router;
