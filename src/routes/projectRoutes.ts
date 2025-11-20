import type { Router } from 'express';
import express from 'express';
import { protect, restrictTo } from '../controllers/authController';
import {
  changeProjectStatus,
  createProject,
  deleteProject,
  getAllProjects,
  getAllUserProjects,
  getProjectById,
  updateProject,
} from '../controllers/projectController';

const router: Router = express.Router();

// GET all projects
router.route('/').get(getAllProjects);

// POST create project
router
  .route('/create')
  .post(protect, restrictTo('cluster_owner', 'cluster_god'), createProject);

// GET all projects for a user (owner or investor)
router.route('/user/:id').get(protect, getAllUserProjects);

// GET, PATCH, DELETE project by :id
router
  .route('/:id')
  .get(getProjectById)
  .patch(protect, restrictTo('cluster_owner', 'cluster_god'), updateProject)
  .delete(protect, restrictTo('cluster_owner', 'cluster_god'), deleteProject);

// PATCH status change
router
  .route('/:id/status')
  .patch(
    protect,
    restrictTo('cluster_owner', 'cluster_god'),
    changeProjectStatus,
  );

export default router;
