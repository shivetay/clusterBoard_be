import type { NextFunction, Request, Response } from 'express';
import type { IUserSchema } from '../model/types';
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

    const requester = (req as Request & { user?: IUserSchema }).user;
    if (
      requester &&
      requester.role !== 'cluster_god' &&
      requester._id.toString() !== id
    ) {
      next(new AppError('AUTH_ERROR_NOT_ALLOWED', STATUSES.FORBIDDEN));
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
