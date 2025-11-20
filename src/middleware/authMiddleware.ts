import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { IUserSchema } from '../model/types';
import User from '../model/userModel';
import { STATUSES } from '../utils';
import AppError from '../utils/appError';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: IUserSchema;
    }
  }
}

interface JwtPayload {
  id: string;
  iat: number;
  exp: number;
}

export const protectJWT = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    // 1) Get token from header
    let token: string | undefined;
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(
        new AppError(
          'You are not logged in! Please log in to get access.',
          STATUSES.UNAUTHORIZED,
        ),
      );
    }

    // 2) Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key',
    ) as JwtPayload;

    // 3) Check if user still exists
    const currentUser = await User.findById(decoded.id).select('+is_active');
    if (!currentUser) {
      return next(
        new AppError(
          'The user belonging to this token no longer exists.',
          STATUSES.UNAUTHORIZED,
        ),
      );
    }

    // 4) Check if user is active
    if (!currentUser.is_active) {
      return next(
        new AppError('This account has been deactivated.', STATUSES.FORBIDDEN),
      );
    }

    // 5) Check if user changed password after token was issued
    if (currentUser.changedPasswordAfter(decoded.iat)) {
      return next(
        new AppError(
          'User recently changed password! Please log in again.',
          STATUSES.UNAUTHORIZED,
        ),
      );
    }

    // Grant access to protected route
    req.user = currentUser;
    next();
  } catch (_error) {
    return next(
      new AppError(
        'Invalid token. Please log in again.',
        STATUSES.UNAUTHORIZED,
      ),
    );
  }
};

export const protectSession = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    // Check if user is authenticated via session
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return next(
        new AppError(
          'You are not logged in! Please log in to get access.',
          STATUSES.UNAUTHORIZED,
        ),
      );
    }

    // Check if user still exists and is active
    const currentUser = await User.findById(req.user?._id).select('+is_active');
    if (!currentUser || !currentUser.is_active) {
      return next(
        new AppError(
          'The user belonging to this session no longer exists or is inactive.',
          STATUSES.UNAUTHORIZED,
        ),
      );
    }

    req.user = currentUser;
    next();
  } catch (_error) {
    return next(
      new AppError(
        'Session authentication failed. Please log in again.',
        STATUSES.UNAUTHORIZED,
      ),
    );
  }
};

export const restrictTo = (...roles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(
        new AppError(
          'You do not have permission to perform this action',
          STATUSES.FORBIDDEN,
        ),
      );
    }
    next();
  };
};

export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    // Try JWT first
    let token: string | undefined;
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
      if (token) {
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET || 'your-secret-key',
        ) as JwtPayload;
        const currentUser = await User.findById(decoded.id).select(
          '+is_active',
        );
        if (currentUser?.is_active) {
          req.user = currentUser;
        }
      }
    }
    // Try session if no JWT
    else if (req.isAuthenticated?.()) {
      const currentUser = await User.findById(req.user?._id).select(
        '+is_active',
      );
      if (currentUser?.is_active) {
        req.user = currentUser;
      }
    }
    next();
  } catch (_error) {
    // Continue without authentication
    next();
  }
};
