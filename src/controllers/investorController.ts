import type { NextFunction, Request, Response } from 'express';
import ClusterProject from '../model/projectModel';
import { STATUSES } from '../utils';
import AppError from '../utils/appError';

// DELETE remove investor from project

export const removeInvestorFromProject = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { projectId, investorId } = req.params;

    // Ensure user is authenticated (should be set by requireAuth middleware)
    if (!req.user || !req.clerkUserId) {
      next(new AppError('AUTH_ERROR_USER_NOT_FOUND', STATUSES.UNAUTHORIZED));
      return;
    }

    const project = await ClusterProject.findById(projectId);

    if (!project) {
      next(new AppError('PROJECT_NOT_FOUND', STATUSES.NOT_FOUND));
      return;
    }

    try {
      project.verifyOwner(req.clerkUserId, req.user.role);
    } catch (ownershipError) {
      next(ownershipError);
      return;
    }

    if (investorId) {
      await project.removeInvestor(investorId);
    }

    res.status(STATUSES.SUCCESS).json({
      status: 'success',
      message: 'INVESTOR_REMOVED_FROM_PROJECT',
    });
  } catch (error) {
    next(error);
  }
};
