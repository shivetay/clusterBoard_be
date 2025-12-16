import type { Router } from 'express';
import express from 'express';
import { editStage, removeStageById } from '../controllers/stageController';
import { requireAuth } from '../middleware/clerk-auth';
import { requireOwnerOrGod } from '../middleware/role-check';

const router: Router = express.Router();

// PATCH, DELETE stage

router
  .route('/:stage_id')
  .patch(requireAuth, requireOwnerOrGod, editStage)
  .delete(requireAuth, requireOwnerOrGod, removeStageById);

export default router;
