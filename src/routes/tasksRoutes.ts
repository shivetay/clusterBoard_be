import type { Router } from 'express';
import express from 'express';
import { requireAuth } from '../middleware/clerk-auth';
import { requireOwnerOrGod } from '../middleware/role-check';

const router: Router = express.Router();

// POST add task to stage

router.route('/:stageId/add').post(requireAuth, requireOwnerOrGod);

// GET all tasks

router.route('/:stageId').get(requireAuth, requireOwnerOrGod);

// PATCH, DELETE task

router
  .route('/:taskId')
  .patch(requireAuth, requireOwnerOrGod)
  .delete(requireAuth, requireOwnerOrGod);

export default router;
