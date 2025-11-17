import type { Router } from 'express';
import express from 'express';
import {
  changeProjectStatus,
  createProject,
  deleteProject,
  getAllProjects,
  getProjectById,
  updateProject,
} from '../controllers/projectController';

const router: Router = express.Router();

// GET all projects
router.route('/').get(getAllProjects);

// POST create project
router.route('/create').post(createProject);

// GET, PATCH, DELETE project by :id
router
  .route('/:id')
  .get(getProjectById)
  .patch(updateProject)
  .delete(deleteProject);

// PATCH status change
router.route('/:id/status').patch(changeProjectStatus);

export default router;
