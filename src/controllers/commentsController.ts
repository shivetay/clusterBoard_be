import type { NextFunction, Request, Response } from 'express';
import Comment from '../model/commentsModel';
import Task from '../model/taskModel';
import { filterAllowedFields, STATUSES } from '../utils';
import AppError from '../utils/appError';

export const createComment = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { author, author_name, comment_text } = req.body;
    const { taskId } = req.params;

    const checkTask = await Task.findById(taskId);

    if (!checkTask) {
      next(new AppError('TASK_NOT_FOUND', STATUSES.NOT_FOUND));
      return;
    }

    const newComment = await Comment.create({
      author,
      author_name,
      task_id: taskId,
      comment_text,
      is_edited: false,
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

    const removeUnmutableData = filterAllowedFields(req.body, 'comment_text');

    const comment = await Comment.findByIdAndUpdate(
      commentId,
      {
        ...removeUnmutableData,
        is_edited: true,
      },
      { new: true, runValidators: true },
    );

    if (!comment) {
      next(new AppError('COMMENT_NOT_FOUND', STATUSES.NOT_FOUND));
      return;
    }

    res.status(STATUSES.CREATED).json({
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
