import type { NextFunction, Request, Response } from 'express';
import User from '../model/userModel';
import { STATUSES } from '../utils';

//Dummy create user

export const createUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email, role } = req.body;

    const newUser = await User.create({
      email,
      role,
    });

    res.status(STATUSES.CREATED).json({
      status: 'success',
      data: {
        user: newUser,
      },
    });
  } catch (error) {
    next(error);
  }
};
