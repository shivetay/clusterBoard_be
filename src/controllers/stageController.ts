import type { NextFunction, Request, Response } from 'express';
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
    const { stage_Id } = req.params;

    const removeStage = await ProjectStages.findByIdAndDelete(stage_Id);

    if (!removeStage) {
      next(new AppError('STAGE_NOT_FOUND', STATUSES.NOT_FOUND));
      return;
    }

    await Task.deleteMany({ stage_id: stage_Id });

    res.status(STATUSES.SUCCESS).json({
      status: 'success',
      message: 'STAGE_DELETED',
    });
  } catch (error) {
    next(error);
  }
};
