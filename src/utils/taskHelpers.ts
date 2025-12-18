import type { NextFunction } from 'express';
import AppError from './appError';
import { STATUSES } from './enums';
import type { StageTaskInput } from './type';

/**
 * Parses stage_task input which can be either an array or comma-separated string
 * @param stage_task - Task input (array or string)
 * @param next - Express next function for error handling
 * @returns Array of task names, or null if validation fails
 */
export const parseTaskNames = (
  stage_task: StageTaskInput,
  next: NextFunction,
): string[] | null => {
  let taskNames: string[];

  if (Array.isArray(stage_task)) {
    taskNames = stage_task
      .map((t) => {
        // If the element is an object with a task_name property, extract it
        if (typeof t === 'object' && t !== null && 'task_name' in t) {
          return String(t.task_name).trim();
        }
        return String(t).trim();
      })
      .filter((t) => t.length > 0);
  } else if (typeof stage_task === 'string') {
    taskNames = stage_task
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
  } else if (typeof stage_task === 'object' && stage_task !== null) {
    // Handle single object case (e.g., { task_name: "Task Name" })
    if ('task_name' in stage_task) {
      taskNames = [String(stage_task.task_name).trim()].filter(
        (t) => t.length > 0,
      );
    } else {
      next(new AppError('INVALID_TASKS_FORMAT', STATUSES.BAD_REQUEST));
      return null;
    }
  } else {
    next(new AppError('INVALID_TASKS_FORMAT', STATUSES.BAD_REQUEST));
    return null;
  }

  return taskNames;
};
