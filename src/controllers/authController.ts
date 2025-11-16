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
    const { user_name, email, password, role } = req.body;

    const newUser = await User.create({
      user_name,
      email,
      password: '123456789',
      password_confirm: '123456789',
      role,
    });

    res.status(STATUSES.SUCCESS).json({
      status: 'success',
      data: {
        user: newUser,
      },
    });
  } catch (error) {
    next(error);
  }
};
