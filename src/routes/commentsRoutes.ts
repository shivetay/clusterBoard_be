import type { Router } from 'express';
import express from 'express';

import {
  createComment,
  deleteComment,
  editComment,
} from '../controllers/commentsController';
import { requireAuth } from '../middleware/clerk-auth';
import {
  checkCommentAuthor,
  requireOwnerOrGod,
} from '../middleware/role-check';

const router: Router = express.Router();

// POST create comments
router
  .route('/:stageId/add/:taskId')
  .post(requireAuth, requireOwnerOrGod, createComment);

// PATCH edit & DELETE comment
router
  .route('/:commentId')
  .patch(requireAuth, checkCommentAuthor, editComment)
  .delete(requireAuth, checkCommentAuthor, deleteComment);

export default router;
