import type { Router } from 'express';
import express from 'express';
import {
  acceptInvitation,
  cancelInvitation,
  getInvitationByToken,
  getProjectInvitations,
  inviteInvestor,
} from '../controllers/invitationController';
import { invitationRateLimit } from '../middleware';
import { requireAuth } from '../middleware/clerk-auth';
import {
  requireAnyAuthenticated,
  requireOwnerOrGod,
} from '../middleware/role-check';

const router: Router = express.Router();

// POST invite investor (requires owner or cluster_god)
router.route('/invite').post(
  invitationRateLimit, // ⭐ RECOMMENDED
  requireAuth,
  requireOwnerOrGod,
  inviteInvestor,
);

// GET invitation details by token (public endpoint for email links)
router.route('/accept/:token').get(getInvitationByToken);

// POST accept invitation (requires authentication)
router
  .route('/accept')
  .post(requireAuth, requireAnyAuthenticated, acceptInvitation);

// GET all invitations for a project (requires owner or cluster_god)
router
  .route('/project/:projectId')
  .get(requireAuth, requireOwnerOrGod, getProjectInvitations);

// DELETE cancel invitation (requires owner or cluster_god)
router
  .route('/:invitationId')
  .delete(requireAuth, requireOwnerOrGod, cancelInvitation);

export default router;
