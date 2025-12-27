import type { Router } from 'express';
import express from 'express';
import { removeInvestorFromProject } from '../controllers/investorController';
import { requireAuth } from '../middleware/clerk-auth';
import { requireOwnerOrGod } from '../middleware/role-check';

const router: Router = express.Router();

// DELETE investor from project
router
  .route('/:projectId/delete/:investorId')
  .delete(requireAuth, requireOwnerOrGod, removeInvestorFromProject);

export default router;
