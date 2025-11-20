import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import type { IUserSchema } from '../model/types';
import User from '../model/userModel';
import { STATUSES } from '../utils';
import AppError from '../utils/appError';

// Helper function to sign JWT token
const signToken = (id: string): string => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: process.env.JWT_EXPIRES_IN || '90d',
  });
};

// Helper function to create and send token
const createSendToken = (
  user: IUserSchema,
  statusCode: number,
  res: Response,
) => {
  const token = signToken(user._id.toString());

  // Remove password from output
  user.password = '';
  user.password_confirm = '';

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

// Register with JWT (local strategy)
export const registerJWT = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { user_name, email, password, password_confirm, role } = req.body;

    // Create new user
    const newUser = await User.create({
      user_name,
      email,
      password,
      password_confirm,
      role: role || 'cluster_owner',
      oauth_provider: 'local',
    });

    createSendToken(newUser, STATUSES.CREATED, res);
  } catch (error) {
    next(error);
  }
};

// Register with Session (local strategy)
export const registerSession = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { user_name, email, password, password_confirm, role } = req.body;

    // Create new user
    const newUser = await User.create({
      user_name,
      email,
      password,
      password_confirm,
      role: role || 'cluster_owner',
      oauth_provider: 'local',
    });

    // Log in the user with passport
    req.login(newUser, (err) => {
      if (err) {
        return next(err);
      }

      // Remove password from output
      newUser.password = '';
      newUser.password_confirm = '';

      res.status(STATUSES.CREATED).json({
        status: 'success',
        data: {
          user: newUser,
        },
      });
    });
  } catch (error) {
    next(error);
  }
};

// Login with JWT (local strategy)
export const loginJWT = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email, password } = req.body;

    // Check if email and password exist
    if (!email || !password) {
      return next(
        new AppError(
          'Please provide email and password!',
          STATUSES.BAD_REQUEST,
        ),
      );
    }

    // Check if user exists and password is correct
    const user = await User.findOne({ email }).select('+password +is_active');

    if (!user || !(await user.comparePassword(password, user.password))) {
      return next(
        new AppError('Incorrect email or password', STATUSES.UNAUTHORIZED),
      );
    }

    // Check if user is active
    if (!user.is_active) {
      return next(
        new AppError('This account has been deactivated.', STATUSES.FORBIDDEN),
      );
    }

    createSendToken(user, STATUSES.SUCCESS, res);
  } catch (error) {
    next(error);
  }
};

// Login with Session (local strategy)
export const loginSession = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  passport.authenticate(
    'local',
    (err: Error, user: IUserSchema, info: { message: string }) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return next(new AppError(info.message, STATUSES.UNAUTHORIZED));
      }

      req.login(user, (loginErr) => {
        if (loginErr) {
          return next(loginErr);
        }

        // Remove password from output
        user.password = '';
        user.password_confirm = '';

        res.status(STATUSES.SUCCESS).json({
          status: 'success',
          data: {
            user,
          },
        });
      });
    },
  )(req, res, next);
};

// Logout (for session-based auth)
export const logout = (req: Request, res: Response, next: NextFunction) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.status(STATUSES.SUCCESS).json({
      status: 'success',
      message: 'Logged out successfully',
    });
  });
};

// Get current user
export const getCurrentUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) {
      return next(new AppError('User not found', STATUSES.NOT_FOUND));
    }

    const user = await User.findById(req.user._id);

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

// Forgot password
export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email } = req.body;

    // Get user based on email
    const user = await User.findOne({ email });
    if (!user) {
      return next(
        new AppError(
          'There is no user with that email address.',
          STATUSES.NOT_FOUND,
        ),
      );
    }

    // Check if user is using OAuth
    if (user.oauth_provider !== 'local') {
      return next(
        new AppError(
          'This account uses OAuth authentication. Please use the OAuth provider to reset your password.',
          STATUSES.BAD_REQUEST,
        ),
      );
    }

    // Generate reset token
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    // Send reset token (in production, send via email)
    // For development, we'll return it in the response
    res.status(STATUSES.SUCCESS).json({
      status: 'success',
      message: 'Password reset token sent to email!',
      resetToken:
        process.env.NODE_ENV === 'development' ? resetToken : undefined,
    });
  } catch (error) {
    next(error);
  }
};

// Reset password
export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { token } = req.params;
    const { password, password_confirm } = req.body;

    // Hash the token from URL
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid token
    const user = await User.findOne({
      password_reset_token: hashedToken,
      password_reset_expires: { $gt: Date.now() },
    });

    if (!user) {
      return next(
        new AppError('Token is invalid or has expired', STATUSES.BAD_REQUEST),
      );
    }

    // Update password
    user.password = password;
    user.password_confirm = password_confirm;
    user.password_reset_token = '';
    user.password_reset_expires = new Date(0);
    await user.save();

    // Log user in (send JWT)
    createSendToken(user, STATUSES.SUCCESS, res);
  } catch (error) {
    next(error);
  }
};

// Update password (for logged-in users)
export const updatePassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { current_password, new_password, new_password_confirm } = req.body;

    if (!req.user) {
      return next(new AppError('User not found', STATUSES.NOT_FOUND));
    }

    // Get user with password
    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return next(new AppError('User not found', STATUSES.NOT_FOUND));
    }

    // Check if user is using OAuth
    if (user.oauth_provider !== 'local') {
      return next(
        new AppError(
          'This account uses OAuth authentication. Password cannot be changed.',
          STATUSES.BAD_REQUEST,
        ),
      );
    }

    // Check if current password is correct
    if (!(await user.comparePassword(current_password, user.password))) {
      return next(
        new AppError('Your current password is wrong.', STATUSES.UNAUTHORIZED),
      );
    }

    // Update password
    user.password = new_password;
    user.password_confirm = new_password_confirm;
    await user.save();

    // Log user in (send JWT)
    createSendToken(user, STATUSES.SUCCESS, res);
  } catch (error) {
    next(error);
  }
};

// Deactivate account
export const deactivateAccount = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) {
      return next(new AppError('User not found', STATUSES.NOT_FOUND));
    }

    await User.findByIdAndUpdate(req.user._id, { is_active: false });

    res.status(STATUSES.NO_CONTENT).json({
      status: 'success',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

// Google OAuth callback
export const googleAuth = passport.authenticate('google', {
  scope: ['profile', 'email'],
});

export const googleAuthCallback = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  passport.authenticate('google', (err: Error, user: IUserSchema) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      return next(new AppError('Authentication failed', STATUSES.UNAUTHORIZED));
    }

    // For JWT-based auth, send token
    if (req.query.auth_type === 'jwt') {
      createSendToken(user, STATUSES.SUCCESS, res);
    } else {
      // For session-based auth, create session
      req.login(user, (loginErr) => {
        if (loginErr) {
          return next(loginErr);
        }

        user.password = '';
        user.password_confirm = '';

        res.status(STATUSES.SUCCESS).json({
          status: 'success',
          data: {
            user,
          },
        });
      });
    }
  })(req, res, next);
};

// Facebook OAuth callback
export const facebookAuth = passport.authenticate('facebook', {
  scope: ['email'],
});

export const facebookAuthCallback = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  passport.authenticate('facebook', (err: Error, user: IUserSchema) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      return next(new AppError('Authentication failed', STATUSES.UNAUTHORIZED));
    }

    // For JWT-based auth, send token
    if (req.query.auth_type === 'jwt') {
      createSendToken(user, STATUSES.SUCCESS, res);
    } else {
      // For session-based auth, create session
      req.login(user, (loginErr) => {
        if (loginErr) {
          return next(loginErr);
        }

        user.password = '';
        user.password_confirm = '';

        res.status(STATUSES.SUCCESS).json({
          status: 'success',
          data: {
            user,
          },
        });
      });
    }
  })(req, res, next);
};

// Dummy create user (keeping for backward compatibility)
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
      password: password || '123456789',
      password_confirm: password || '123456789',
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
