import type { NextFunction, Request, Response } from 'express';
import ClusterProject from '../model/projectModel';
import ProjectStages from '../model/stageModel';
import Task from '../model/taskModel';
import { filterAllowedFields, STATUSES } from '../utils';
import AppError from '../utils/appError';

// PATCH stage by :stage_Id
export const editStage = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { stage_id } = req.params;

    if (!req.user || !req.clerkUserId) {
      next(new AppError('AUTH_ERROR_USER_NOT_FOUND', STATUSES.UNAUTHORIZED));
      return;
    }

    const removeUnmutableData = filterAllowedFields(
      req.body,
      'stage_name',
      'stage_description',
      'is_done',
    );

    const stage = await ProjectStages.findById(stage_id);

    if (!stage) {
      next(new AppError('STAGE_NOT_FOUND', STATUSES.NOT_FOUND));
      return;
    }

    const project = await ClusterProject.findById(stage.cluster_project_id);

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

    const updateStage = await ProjectStages.findByIdAndUpdate(
      stage_id,
      removeUnmutableData,
      { new: true, runValidators: true },
    );

    if (!updateStage) {
      next(new AppError('STAGE_NOT_FOUND', STATUSES.NOT_FOUND));
      return;
    }

    res.status(STATUSES.SUCCESS).json({
      status: 'success',
      data: {
        stage: updateStage,
      },
      message: 'STAGE_UPDATED',
    });
  } catch (error) {
    next(error);
  }
};

// DELETE stage by :stage_Id
export const removeStageById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { stage_id } = req.params;

    if (!req.user || !req.clerkUserId) {
      next(new AppError('AUTH_ERROR_USER_NOT_FOUND', STATUSES.UNAUTHORIZED));
      return;
    }

    const stage = await ProjectStages.findById(stage_id);

    if (!stage) {
      next(new AppError('STAGE_NOT_FOUND', STATUSES.NOT_FOUND));
      return;
    }

    const project = await ClusterProject.findById(stage.cluster_project_id);

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

    const removeStage = await ProjectStages.findByIdAndDelete(stage_id);

    if (!removeStage) {
      next(new AppError('STAGE_NOT_FOUND', STATUSES.NOT_FOUND));
      return;
    }

    await Task.deleteMany({ stage_id: stage_id });

    res.status(STATUSES.SUCCESS).json({
      status: 'success',
      message: 'STAGE_DELETED',
    });
  } catch (error) {
    next(error);
  }
};
