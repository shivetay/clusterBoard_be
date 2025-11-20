import type { NextFunction, Request, Response } from 'express';
import User from '../model/userModel';
import { STATUSES } from '../utils';
import AppError from '../utils/appError';

// GET All users
export const getAllUsers = async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const users = await User.find().populate({ path: 'cluster_projects' });
    res.status(STATUSES.SUCCESS).json({
      status: 'success',
      results: users.length,
      data: {
        users,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET user by id
export const getUserById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;

    if (!req.user) {
      next(new AppError('AUTH_ERROR_NOT_LOGGED_IN', STATUSES.UNAUTHORIZED));
      return;
    }

    const isSelf = req.user.id === id;
    const isSuperUser = req.user.role === 'cluster_god';

    if (!isSelf && !isSuperUser) {
      next(new AppError('AUTH_ERROR_FORBIDDEN', STATUSES.FORBIDDEN));
      return;
    }

    const user = await User.findById(id).populate({ path: 'cluster_projects' });

    if (!user) {
      next(new AppError('AUTH_ERROR_USER_NOT_FOUND', STATUSES.NOT_FOUND));
      return;
    }

    res.status(STATUSES.SUCCESS).json({
      status: 'success',
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};
