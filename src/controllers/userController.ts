import type { NextFunction, Request, Response } from 'express';
import User from '../model/userModel';
import AppError from '../utils/appError';

// GET All users
export const getAllUsers = async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const users = await User.find().populate({ path: 'cluster_projects' });
    res.status(200).json({
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
    const user = await User.findOne({ clerk_id: id }).populate({
      path: 'cluster_projects',
    });

    if (!user) {
      next(new AppError('AUTH_ERROR_USER_NOT_FOUND', 404));
      return;
    }

    res.status(200).json({
      status: 'success',
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};
