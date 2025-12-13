import type { NextFunction, Request, Response } from 'express';
import ClusterProject from '../model/projectModel';
import ProjectStages from '../model/stageModel';
import Task from '../model/taskModel';
import { filterAllowedFields, STATUSES } from '../utils';
import AppError from '../utils/appError';
import { parseTaskNames } from '../utils/taskHelpers';

export const addTasksToStage = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { stageId } = req.params;
    const { stage_task } = req.body;

    const stage = await ProjectStages.findById(stageId);

    if (!stage) {
      next(new AppError('STAGE_NOT_FOUND', STATUSES.NOT_FOUND));
      return;
    }

    const projectStage = await ClusterProject.findById(
      stage.cluster_project_id,
    );

    if (!projectStage) {
      next(new AppError('STAGE_NOT_FOUND', STATUSES.NOT_FOUND));
      return;
    }

    // Handle both array and comma-separated string (flexible approach)
    const taskNames = parseTaskNames(stage_task, next);

    if (!taskNames) {
      return;
    }

    if (taskNames.length === 0) {
      next(new AppError('AT_LEAST_ONE_TASK_REQUIRED', STATUSES.BAD_REQUEST));
      return;
    }

    // Create task documents
    const taskDocuments = taskNames.map((taskName) => ({
      stage_id: stageId,
      task_name: taskName,
      is_done: false,
    }));

    // Bulk insert
    const createdTasks = await Task.insertMany(taskDocuments);

    res.status(STATUSES.CREATED).json({
      status: 'success',
      data: {
        tasks: createdTasks,
      },
      message: 'TASKS_ADDED_TO_STAGE',
    });
  } catch (error) {
    next(error);
  }
};

// PATCH tasks name or status change
export const updateTask = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { taskId } = req.params;

    // Ensure user is authenticated
    if (!req.user || !req.clerkUserId) {
      next(new AppError('AUTH_ERROR_USER_NOT_FOUND', STATUSES.UNAUTHORIZED));
      return;
    }

    const task = await Task.findById(taskId);

    if (!task) {
      next(new AppError('TASK_NOT_FOUND', STATUSES.NOT_FOUND));
      return;
    }

    // Find stage and project to verify ownership
    const stage = await ProjectStages.findById(task.stage_id);

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

    // Filter allowed fields
    const allowedUpdates = filterAllowedFields(
      req.body,
      'task_name',
      'is_done',
    );

    const updatedTask = await Task.findByIdAndUpdate(taskId, allowedUpdates, {
      new: true,
      runValidators: true,
    });

    res.status(STATUSES.SUCCESS).json({
      status: 'success',
      data: {
        task: updatedTask,
      },
      message: 'TASK_UPDATED',
    });
  } catch (error) {
    next(error);
  }
};

// DELETE task
export const deleteTask = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { taskId } = req.params;

    // Ensure user is authenticated
    if (!req.user || !req.clerkUserId) {
      next(new AppError('AUTH_ERROR_USER_NOT_FOUND', STATUSES.UNAUTHORIZED));
      return;
    }

    const task = await Task.findById(taskId);

    if (!task) {
      next(new AppError('TASK_NOT_FOUND', STATUSES.NOT_FOUND));
      return;
    }

    // Find stage and project to verify ownership
    const stage = await ProjectStages.findById(task.stage_id);

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

    await Task.findByIdAndDelete(taskId);

    res.status(STATUSES.SUCCESS).json({
      status: 'success',
      message: 'TASK_DELETED',
    });
  } catch (error) {
    next(error);
  }
};
