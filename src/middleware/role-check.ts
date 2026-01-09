import type { NextFunction, Request, Response } from 'express';
import Comment from '../model/commentsModel';
import Project from '../model/projectModel';
import type { TUserRoleType } from '../model/types/userModel.type';
import { STATUSES } from '../utils';

export const checkRole = (...allowedRoles: TUserRoleType[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(STATUSES.UNAUTHORIZED).json({
        error: 'Authentication required',
        message: 'You must be logged in to access this resource',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(STATUSES.FORBIDDEN).json({
        error: 'Access denied. Insufficient permissions.',
        required: allowedRoles,
      });
    }

    next();
  };
};

export const checkProjectOwner = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) {
      return res.status(STATUSES.UNAUTHORIZED).json({
        error: 'Authentication required',
        message: 'You must be logged in to access this resource',
      });
    }

    const { projectId } = req.params;

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(STATUSES.NOT_FOUND).json({
        error: 'Project not found',
      });
    }

    if (project.owner.owner_id !== req.user.clerk_id) {
      return res.status(STATUSES.FORBIDDEN).json({
        error: 'Access denied. Only project owner can perform this action.',
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

export const checkCommentAuthor = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) {
      return res.status(STATUSES.UNAUTHORIZED).json({
        error: 'Authentication required',
        message: 'You must be logged in to access this resource',
      });
    }

    const { commentId } = req.params;

    const comment = await Comment.findById(commentId);

    if (!comment) {
      return res.status(STATUSES.NOT_FOUND).json({
        error: 'Comment not found',
      });
    }

    if (comment.author !== req.user.clerk_id) {
      return res.status(STATUSES.FORBIDDEN).json({
        error: 'Access denied. Only comment author can perform this action.',
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

export const requireClusterGod = checkRole('cluster_god');
export const requireOwnerOrGod = checkRole('cluster_owner', 'cluster_god');
export const requireAnyAuthenticated = checkRole(
  'investor',
  'cluster_owner',
  'cluster_god',
  'team_member',
);
