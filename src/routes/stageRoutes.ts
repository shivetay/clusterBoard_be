import type { Router } from 'express';
import express from 'express';
import { removeStageById } from '../controllers/stageController';
import { requireAuth } from '../middleware/clerk-auth';
import { requireOwnerOrGod } from '../middleware/role-check';

const router: Router = express.Router();

// PATCH, DELETE stage

router
  .route('/:stage_Id')
  .patch(requireAuth, requireOwnerOrGod)
  .delete(requireAuth, requireOwnerOrGod, removeStageById);

export default router;
