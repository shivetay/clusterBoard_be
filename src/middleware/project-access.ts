import type { NextFunction, Request, Response } from 'express';
import ClusterProject from '../model/projectModel';
import { STATUSES } from '../utils';
import AppError from '../utils/appError';

export const requireProjectAccess = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;

    if (!req.user || !req.clerkUserId) {
      next(new AppError('AUTH_ERROR_USER_NOT_FOUND', STATUSES.UNAUTHORIZED));
      return;
    }

    const project = await ClusterProject.findById(id);

    if (!project) {
      next(new AppError('PROJECT_NOT_FOUND', STATUSES.NOT_FOUND));
      return;
    }

    // ✅ Use project-specific access check
    if (!project.canAccessProject(req.clerkUserId, req.user.role)) {
      next(new AppError('FORBIDDEN_NO_PROJECT_ACCESS', STATUSES.FORBIDDEN));
      return;
    }

    // Attach access level to request
    req.projectAccessLevel = project.getUserAccessLevel(
      req.clerkUserId,
      req.user.role,
    );
    req.project = project;
    next();
  } catch (error) {
    next(error);
  }
};

// Middleware for owner-only actions
export const requireProjectOwner = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;

    if (!req.user || !req.clerkUserId) {
      next(new AppError('AUTH_ERROR_USER_NOT_FOUND', STATUSES.UNAUTHORIZED));
      return;
    }

    const project = await ClusterProject.findById(id);

    if (!project) {
      next(new AppError('PROJECT_NOT_FOUND', STATUSES.NOT_FOUND));
      return;
    }

    // ✅ Check if user is owner (not just investor)
    const isOwner = project.owner.owner_id === req.clerkUserId;
    const isClusterGod = req.user.role === 'cluster_god';

    if (!isOwner && !isClusterGod) {
      next(new AppError('FORBIDDEN_NOT_PROJECT_OWNER', STATUSES.FORBIDDEN));
      return;
    }

    req.project = project;
    next();
  } catch (error) {
    next(error);
  }
};
