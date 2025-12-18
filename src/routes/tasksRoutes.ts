import type { Router } from 'express';
import express from 'express';
import {
  addTasksToStage,
  deleteTask,
  updateTask,
} from '../controllers/taskController';
import { requireAuth } from '../middleware/clerk-auth';
import { requireOwnerOrGod } from '../middleware/role-check';

const router: Router = express.Router();

// POST add task to stage

router
  .route('/:stageId/add-tasks')
  .post(requireAuth, requireOwnerOrGod, addTasksToStage);

// GET all tasks
// TODO check if there may be rout error mismatch with taskId
router.route('/:stageId').get(requireAuth, requireOwnerOrGod, (req, res) => {
  res.status(501).json({ message: 'Not implemented' });
});

// PATCH, DELETE task

router
  .route('/:taskId')
  .patch(requireAuth, requireOwnerOrGod, updateTask)
  .delete(requireAuth, requireOwnerOrGod, deleteTask);

export default router;
