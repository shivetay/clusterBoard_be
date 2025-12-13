import type { NextFunction, Request, Response } from 'express';
import ProjectStages from '../model/stageModel';
import Task from '../model/taskModel';
import { STATUSES } from '../utils';
import AppError from '../utils/appError';

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
