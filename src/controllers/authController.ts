import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import type { JwtPayload } from 'jsonwebtoken';
import jwt from 'jsonwebtoken';
import type { IUserSchema, TUserRoleType } from '../model/types';
import User from '../model/userModel';
import { STATUSES } from '../utils';
import AppError from '../utils/appError';

type AuthStrategy = 'jwt' | 'cookie';

const AUTH_COOKIE_NAME = 'access_token';
const DEFAULT_AUTH_STRATEGY: AuthStrategy =
  process.env.DEFAULT_AUTH_STRATEGY === 'cookie' ? 'cookie' : 'jwt';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const JWT_SECRET = process.env.JWT_SECRET || 'cluster-board-dev-secret';
const JWT_COOKIE_EXPIRES_IN_DAYS = Number(
  process.env.JWT_COOKIE_EXPIRES_IN_DAYS || '7',
);
const COOKIE_CLEAR_OFFSET_MS = 1000;
const MS_IN_SECOND = 1000;
const MS_IN_DAY = 24 * 60 * 60 * MS_IN_SECOND;
const GOOGLE_USERNAME_RANDOM_BYTES = 4;
const FACEBOOK_ID_PREFIX_LENGTH = 6;
const FACEBOOK_USERNAME_RANDOM_BYTES = 2;
const OAUTH_FALLBACK_ROLE: TUserRoleType = 'cluster_owner';
const googleClient = new OAuth2Client();

const sanitizeUser = (user: IUserSchema) => {
  const plainUser = user.toObject<Record<string, unknown>>();
  delete plainUser.password;
  delete plainUser.password_confirm;
  delete plainUser.password_reset_token;
  delete plainUser.password_reset_expires;
  return plainUser;
};

const parseStrategy = (value?: unknown): AuthStrategy | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.toLowerCase();
  if (normalized === 'cookie') {
    return 'cookie';
  }
  if (normalized === 'jwt') {
    return 'jwt';
  }
  return null;
};

const resolveStrategy = (req: Request): AuthStrategy => {
  const inferredFromBody = parseStrategy(req.body?.authStrategy);
  const inferredFromQuery = parseStrategy(
    Array.isArray(req.query?.authStrategy)
      ? req.query?.authStrategy[0]
      : req.query?.authStrategy,
  );

  const strategy =
    inferredFromBody ?? inferredFromQuery ?? DEFAULT_AUTH_STRATEGY;
  req.authStrategy = strategy;
  return strategy;
};

const signToken = (id: string) => {
  return jwt.sign({ id }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
};

const sendTokenResponse = (
  user: IUserSchema,
  statusCode: number,
  req: Request,
  res: Response,
) => {
  const strategy = resolveStrategy(req);
  const token = signToken(user.id);
  const responsePayload = {
    status: 'success',
    strategy,
    data: {
      user: sanitizeUser(user),
    },
  };

  if (strategy === 'cookie') {
    res.cookie(AUTH_COOKIE_NAME, token, {
      expires: new Date(Date.now() + JWT_COOKIE_EXPIRES_IN_DAYS * MS_IN_DAY),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
    res.status(statusCode).json(responsePayload);
    return;
  }

  res.status(statusCode).json({
    ...responsePayload,
    token,
  });
};

const getTokenFromRequest = (req: Request) => {
  if (req.headers.authorization?.startsWith('Bearer ')) {
    return req.headers.authorization.split(' ')[1];
  }
  if (req.cookies?.[AUTH_COOKIE_NAME]) {
    return req.cookies[AUTH_COOKIE_NAME];
  }
  return null;
};

const generateRandomPassword = () => {
  return crypto.randomBytes(24).toString('hex');
};

const ensureOAuthUser = async ({
  email,
  user_name,
  role = OAUTH_FALLBACK_ROLE,
}: {
  email: string;
  user_name: string;
  role?: TUserRoleType;
}) => {
  let user = await User.findOne({ email });
  if (!user) {
    const password = generateRandomPassword();
    user = await User.create({
      user_name,
      email,
      role,
      password,
      password_confirm: password,
    });
  }
  return user;
};

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { user_name, email, password, password_confirm, role } = req.body;

    if (!user_name || !email || !password || !password_confirm) {
      next(new AppError('AUTH_ERROR_MISSING_FIELDS', STATUSES.BAD_REQUEST));
      return;
    }

    const newUser = await User.create({
      user_name,
      email,
      password,
      password_confirm,
      role,
    });

    sendTokenResponse(newUser, STATUSES.CREATED, req, res);
  } catch (error) {
    next(error);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      next(
        new AppError('AUTH_ERROR_MISSING_CREDENTIALS', STATUSES.BAD_REQUEST),
      );
      return;
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.comparePassword(password, user.password))) {
      next(
        new AppError('AUTH_ERROR_INVALID_CREDENTIALS', STATUSES.UNAUTHORIZED),
      );
      return;
    }

    user.password = undefined as unknown as string;
    sendTokenResponse(user, STATUSES.SUCCESS, req, res);
  } catch (error) {
    next(error);
  }
};

export const logout = (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.cookie(AUTH_COOKIE_NAME, '', {
      expires: new Date(Date.now() - COOKIE_CLEAR_OFFSET_MS),
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    res.status(STATUSES.SUCCESS).json({
      status: 'success',
      message: 'LOGGED_OUT',
    });
  } catch (error) {
    next(error);
  }
};

export const protect = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    const token = getTokenFromRequest(req);

    if (!token) {
      next(new AppError('AUTH_ERROR_NOT_LOGGED_IN', STATUSES.UNAUTHORIZED));
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload & {
      id: string;
      iat?: number;
    };

    const currentUser = await User.findById(decoded.id);

    if (!currentUser) {
      next(new AppError('AUTH_ERROR_USER_NOT_FOUND', STATUSES.UNAUTHORIZED));
      return;
    }

    if (decoded.iat && currentUser.changedPasswordAfter(decoded.iat)) {
      next(new AppError('AUTH_ERROR_PASSWORD_CHANGED', STATUSES.UNAUTHORIZED));
      return;
    }

    req.user = currentUser;
    next();
  } catch (error) {
    next(error);
  }
};

export const restrictTo =
  (...roles: TUserRoleType[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(new AppError('AUTH_ERROR_NOT_LOGGED_IN', STATUSES.UNAUTHORIZED));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(new AppError('AUTH_ERROR_FORBIDDEN', STATUSES.FORBIDDEN));
      return;
    }

    next();
  };

export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email } = req.body;

    if (!email) {
      next(new AppError('AUTH_ERROR_EMAIL_REQUIRED', STATUSES.BAD_REQUEST));
      return;
    }

    const user = await User.findOne({ email });

    if (!user) {
      res.status(STATUSES.SUCCESS).json({
        status: 'success',
        message: 'PASSWORD_RESET_EMAIL_SENT',
      });
      return;
    }

    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    const resetURL = `${req.protocol}://${req.get('host')}/api/v1/auth/reset-password/${resetToken}`;

    res.status(STATUSES.SUCCESS).json({
      status: 'success',
      message: 'PASSWORD_RESET_EMAIL_SENT',
      data: {
        resetToken,
        resetURL,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { token } = req.params;
    const { password, password_confirm } = req.body;

    if (!password || !password_confirm) {
      next(new AppError('AUTH_ERROR_MISSING_FIELDS', STATUSES.BAD_REQUEST));
      return;
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      password_reset_token: hashedToken,
      password_reset_expires: { $gt: new Date() },
    });

    if (!user) {
      next(new AppError('AUTH_ERROR_INVALID_TOKEN', STATUSES.BAD_REQUEST));
      return;
    }

    user.password = password;
    user.password_confirm = password_confirm;
    user.password_reset_token = null;
    user.password_reset_expires = null;
    await user.save();

    sendTokenResponse(user, STATUSES.SUCCESS, req, res);
  } catch (error) {
    next(error);
  }
};

export const updatePassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { current_password, password, password_confirm } = req.body;
    if (!req.user) {
      next(new AppError('AUTH_ERROR_NOT_LOGGED_IN', STATUSES.UNAUTHORIZED));
      return;
    }

    if (!current_password || !password || !password_confirm) {
      next(new AppError('AUTH_ERROR_MISSING_FIELDS', STATUSES.BAD_REQUEST));
      return;
    }

    const user = await User.findById(req.user.id).select('+password');

    if (!user) {
      next(new AppError('AUTH_ERROR_USER_NOT_FOUND', STATUSES.NOT_FOUND));
      return;
    }

    const isCurrentPasswordValid = await user.comparePassword(
      current_password,
      user.password,
    );

    if (!isCurrentPasswordValid) {
      next(
        new AppError(
          'AUTH_ERROR_INVALID_CURRENT_PASSWORD',
          STATUSES.UNAUTHORIZED,
        ),
      );
      return;
    }

    user.password = password;
    user.password_confirm = password_confirm;
    await user.save();

    sendTokenResponse(user, STATUSES.SUCCESS, req, res);
  } catch (error) {
    next(error);
  }
};

export const loginWithGoogle = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { idToken } = req.body;
    const clientId = process.env.GOOGLE_CLIENT_ID;

    if (!idToken) {
      next(new AppError('GOOGLE_ID_TOKEN_REQUIRED', STATUSES.BAD_REQUEST));
      return;
    }

    if (!clientId) {
      next(new AppError('GOOGLE_CLIENT_ID_MISSING', STATUSES.SERVER_ERROR));
      return;
    }

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: clientId,
    });

    const payload = ticket.getPayload();

    if (!payload?.email) {
      next(new AppError('GOOGLE_ID_TOKEN_MISSING_EMAIL', STATUSES.BAD_REQUEST));
      return;
    }

    const user = await ensureOAuthUser({
      email: payload.email,
      user_name:
        payload.name ??
        payload.email.split('@')[0] ??
        `google_user_${crypto
          .randomBytes(GOOGLE_USERNAME_RANDOM_BYTES)
          .toString('hex')}`,
    });

    sendTokenResponse(user, STATUSES.SUCCESS, req, res);
  } catch (error) {
    next(error);
  }
};

export const loginWithFacebook = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { accessToken } = req.body;
    const appId = process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;

    if (!accessToken) {
      next(
        new AppError('FACEBOOK_ACCESS_TOKEN_REQUIRED', STATUSES.BAD_REQUEST),
      );
      return;
    }

    if (!appId || !appSecret) {
      next(new AppError('FACEBOOK_APP_CONFIG_MISSING', STATUSES.SERVER_ERROR));
      return;
    }

    const debugTokenUrl = new URL('https://graph.facebook.com/debug_token');
    debugTokenUrl.searchParams.set('input_token', accessToken);
    debugTokenUrl.searchParams.set('access_token', `${appId}|${appSecret}`);

    const debugResponse = await fetch(debugTokenUrl);
    const debugData = (await debugResponse.json()) as {
      data?: { is_valid?: boolean };
      error?: { message?: string };
    };

    if (!debugResponse.ok || !debugData.data?.is_valid) {
      next(
        new AppError('FACEBOOK_ACCESS_TOKEN_INVALID', STATUSES.UNAUTHORIZED),
      );
      return;
    }

    const profileUrl = new URL('https://graph.facebook.com/me');
    profileUrl.searchParams.set('fields', 'id,name,email');
    profileUrl.searchParams.set('access_token', accessToken);

    const profileResponse = await fetch(profileUrl);
    const profile = (await profileResponse.json()) as {
      id?: string;
      name?: string;
      email?: string;
    };

    if (!profileResponse.ok || !profile.id) {
      next(new AppError('FACEBOOK_PROFILE_UNAVAILABLE', STATUSES.UNAUTHORIZED));
      return;
    }

    const fallbackEmail = `${profile.id}@facebook.local`;

    const user = await ensureOAuthUser({
      email: profile.email ?? fallbackEmail,
      user_name:
        profile.name ??
        `fb_user_${profile.id.slice(0, FACEBOOK_ID_PREFIX_LENGTH)}_${crypto
          .randomBytes(FACEBOOK_USERNAME_RANDOM_BYTES)
          .toString('hex')}`,
    });

    sendTokenResponse(user, STATUSES.SUCCESS, req, res);
  } catch (error) {
    next(error);
  }
};

export type { AuthStrategy };
