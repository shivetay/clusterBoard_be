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

// GET project by :id
router.route('/:id').get(getProjectById);

// POST create project
router.route('/create').post(createProject);

// PATCH update project
router.route('/:id/update').patch(updateProject);

// DELETE project
router.route('/:id').delete(deleteProject);

// PATCH status change
router.route('/:id/status').patch(changeProjectStatus);

export default router;
