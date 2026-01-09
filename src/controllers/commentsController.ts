import { clerkClient } from '@clerk/express';
import type { NextFunction, Request, Response } from 'express';
import Comment from '../model/commentsModel';
import ProjectStages from '../model/stageModel';
import Task from '../model/taskModel';
import { filterAllowedFields, STATUSES } from '../utils';
import AppError from '../utils/appError';

export const createComment = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { comment_text } = req.body;
    const { taskId, stageId } = req.params;

    if (!req.user || !req.clerkUserId) {
      next(new AppError('AUTH_ERROR_USER_NOT_FOUND', STATUSES.UNAUTHORIZED));
      return;
    }

    const clerkUser = await clerkClient.users.getUser(req.clerkUserId);

    const userFullName = `${clerkUser.firstName || ''} ${
      clerkUser.lastName || ''
    }`.trim();

    const checkTask = await Task.findById(taskId);

    if (!checkTask) {
      next(new AppError('TASK_NOT_FOUND', STATUSES.NOT_FOUND));
      return;
    }

    const checkStage = await ProjectStages.findById(stageId);

    if (!checkStage) {
      next(new AppError('STAGE_NOT_FOUND', STATUSES.NOT_FOUND));
      return;
    }

    if (typeof comment_text !== 'string' || comment_text.trim().length === 0) {
      next(new AppError('COMMENT_TEXT_REQUIRED', STATUSES.BAD_REQUEST));
      return;
    }

    const newComment = await Comment.create({
      author: req.clerkUserId,
      author_name: userFullName,
      task_id: taskId,
      comment_text,
    });

    res.status(STATUSES.CREATED).json({
      status: 'success',
      data: {
        comment: {
          comment_text: newComment.comment_text,
          author: newComment.author_name,
        },
        message: 'COMMENT_CREATED',
      },
    });
  } catch (error) {
    next(error);
  }
};

export const editComment = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { commentId } = req.params;

    const allowedFields = filterAllowedFields(req.body, 'comment_text');

    const comment = await Comment.findByIdAndUpdate(
      commentId,
      {
        ...allowedFields,
        is_edited: true,
      },
      { new: true, runValidators: true },
    );

    if (!comment) {
      next(new AppError('COMMENT_NOT_FOUND', STATUSES.NOT_FOUND));
      return;
    }

    res.status(STATUSES.SUCCESS).json({
      status: 'success',
      data: {
        comment: {
          comment_text: comment.comment_text,
          author: comment.author_name,
          is_edited: comment.is_edited,
        },
        message: 'COMMENT_UPDATED',
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteComment = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { commentId } = req.params;

    const comment = await Comment.findByIdAndDelete(commentId);

    if (!comment) {
      next(new AppError('COMMENT_NOT_FOUND', STATUSES.NOT_FOUND));
      return;
    }

    res.status(STATUSES.SUCCESS).json({
      status: 'success',
      message: 'COMMENT_DELETED',
    });
  } catch (error) {
    next(error);
  }
};
