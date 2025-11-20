import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import type { JwtPayload } from 'jsonwebtoken';
import jwt from 'jsonwebtoken';
import type { IUserSchema, TUserRoleType } from '../model/types';
import User from '../model/userModel';
import { STATUSES } from '../utils';
import AppError from '../utils/appError';

type SessionStrategy = 'jwt' | 'cookie';

export const SESSION_STRATEGIES: Record<'JWT' | 'COOKIE', SessionStrategy> =
  Object.freeze({
    JWT: 'jwt',
    COOKIE: 'cookie',
  });

interface AuthenticatedRequest extends Request {
  user?: IUserSchema;
  sessionStrategy?: SessionStrategy;
}

interface DecodedToken extends JwtPayload {
  id: string;
  iat: number;
}

type TokenExtraction =
  | { token: string; strategy: SessionStrategy }
  | { token: null; strategy: null };

const JWT_DEFAULT_EXPIRES_IN = '1d';
const COOKIE_DEFAULT_EXPIRES_DAYS = 7;
const HOURS_PER_DAY = 24;
const MINUTES_PER_HOUR = 60;
const SECONDS_PER_MINUTE = 60;
const MILLISECONDS_PER_SECOND = 1000;
const DAY_IN_MS =
  HOURS_PER_DAY *
  MINUTES_PER_HOUR *
  SECONDS_PER_MINUTE *
  MILLISECONDS_PER_SECOND;
const MAX_USERNAME_LENGTH = 20;
const RANDOM_USERNAME_BYTES = 4;
const MIN_USERNAME_LENGTH = 1;
const RANDOM_PASSWORD_BYTES = 24;
const PASSWORD_RESET_EXPIRY_MINUTES = Number(
  process.env.PASSWORD_RESET_TOKEN_EXPIRES_IN_MINUTES ?? 10,
);
const USER_ROLE_VALUES: readonly TUserRoleType[] = [
  'investor',
  'cluster_owner',
  'cluster_god',
  'team_member',
];
const isProduction = process.env.NODE_ENV === 'production';

const parseSessionStrategy = (value?: unknown): SessionStrategy | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.toLowerCase();
  if (normalized === SESSION_STRATEGIES.JWT) {
    return SESSION_STRATEGIES.JWT;
  }
  if (normalized === SESSION_STRATEGIES.COOKIE) {
    return SESSION_STRATEGIES.COOKIE;
  }
  return null;
};

const resolveSessionStrategy = (
  req: Request,
  fallback?: SessionStrategy,
): SessionStrategy => {
  const candidate =
    parseSessionStrategy(
      (req.body?.session_strategy ??
        req.body?.sessionStrategy ??
        req.headers['x-session-strategy']) as string,
    ) ??
    parseSessionStrategy(req.query?.session_strategy as string) ??
    fallback;

  return candidate ?? SESSION_STRATEGIES.COOKIE;
};

const buildCookieOptions = () => {
  const expiresDays = Number(
    process.env.JWT_COOKIE_EXPIRES_IN_DAYS ?? COOKIE_DEFAULT_EXPIRES_DAYS,
  );
  const expires = new Date(Date.now() + expiresDays * DAY_IN_MS);
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
    expires,
  };
};

const sanitizeUser = (user: IUserSchema) => {
  const plainUser = user.toObject() as Record<string, unknown>;
  delete plainUser.password;
  delete plainUser.password_confirm;
  delete plainUser.password_reset_token;
  delete plainUser.password_reset_expires;
  return plainUser;
};

const signToken = (id: string) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new AppError('AUTH_ERROR_MISSING_SECRET', STATUSES.SERVER_ERROR);
  }

  const expiresIn = process.env.JWT_EXPIRES_IN ?? JWT_DEFAULT_EXPIRES_IN;
  return jwt.sign({ id }, secret, { expiresIn });
};

const createSendToken = (
  user: IUserSchema,
  req: Request,
  res: Response,
  statusCode: number,
  strategyOverride?: SessionStrategy,
) => {
  const sessionStrategy = resolveSessionStrategy(req, strategyOverride);
  const token = signToken(user._id.toString());

  if (sessionStrategy === SESSION_STRATEGIES.COOKIE) {
    res.cookie('jwt', token, buildCookieOptions());
  } else {
    res.clearCookie('jwt');
  }

  const responsePayload: Record<string, unknown> = {
    status: 'success',
    sessionStrategy,
    data: {
      user: sanitizeUser(user),
    },
  };

  if (sessionStrategy === SESSION_STRATEGIES.JWT) {
    responsePayload.token = token;
    responsePayload.expiresIn =
      process.env.JWT_EXPIRES_IN ?? JWT_DEFAULT_EXPIRES_IN;
  }

  res.status(statusCode).json(responsePayload);
};

const extractAuthToken = (req: Request): TokenExtraction => {
  const authHeader = req.headers.authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return {
      token: authHeader.split(' ')[1],
      strategy: SESSION_STRATEGIES.JWT,
    };
  }

  const cookieToken = req.cookies?.jwt;
  if (typeof cookieToken === 'string' && cookieToken.length > 0) {
    return {
      token: cookieToken,
      strategy: SESSION_STRATEGIES.COOKIE,
    };
  }

  return { token: null, strategy: null };
};

const ensureRole = (role?: string): TUserRoleType | undefined => {
  if (!role) {
    return undefined;
  }
  return USER_ROLE_VALUES.find((value) => value === role) ?? undefined;
};

const buildRandomPassword = () =>
  crypto.randomBytes(RANDOM_PASSWORD_BYTES).toString('hex');

const normalizeUserNameBase = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

const ensureUniqueUserName = async (proposed: string) => {
  const normalized = normalizeUserNameBase(proposed).slice(
    0,
    MAX_USERNAME_LENGTH,
  );
  let candidate =
    normalized ||
    `user_${crypto.randomBytes(RANDOM_USERNAME_BYTES).toString('hex')}`;
  let counter = 1;

  while (await User.exists({ user_name: candidate })) {
    const suffix = `_${counter}`;
    const trimmed =
      normalized.slice(
        0,
        Math.max(MIN_USERNAME_LENGTH, MAX_USERNAME_LENGTH - suffix.length),
      ) || candidate;
    candidate = `${trimmed}${suffix}`;
    counter += 1;
  }

  return candidate;
};

const getResetUrl = (req: Request, token: string) => {
  const candidateBase =
    req.body?.reset_base_url ?? process.env.RESET_PASSWORD_REDIRECT_URL;
  if (!candidateBase) {
    return null;
  }

  try {
    const url = new URL(candidateBase);
    url.searchParams.set('token', token);
    return url.toString();
  } catch {
    return null;
  }
};

const findOrCreateUserByEmail = async (
  email: string,
  nameHint: string,
  role?: string,
) => {
  let user = await User.findOne({ email });

  if (user) {
    return user;
  }

  const randomPassword = buildRandomPassword();
  const uniqueUserName = await ensureUniqueUserName(nameHint || email);
  const resolvedRole = ensureRole(role) ?? 'cluster_owner';

  user = await User.create({
    user_name: uniqueUserName,
    email,
    role: resolvedRole,
    password: randomPassword,
    password_confirm: randomPassword,
  });

  return user;
};

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { user_name, email, password, password_confirm, role } =
      req.body ?? {};

    if (!user_name || !email || !password || !password_confirm) {
      next(
        new AppError('AUTH_ERROR_MISSING_CREDENTIALS', STATUSES.BAD_REQUEST),
      );
      return;
    }

    const newUser = await User.create({
      user_name,
      email,
      password,
      password_confirm,
      role: ensureRole(role) ?? undefined,
    });

    createSendToken(newUser, req, res, STATUSES.CREATED);
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
    const { email, password } = req.body ?? {};

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

    createSendToken(user, req, res, STATUSES.SUCCESS);
  } catch (error) {
    next(error);
  }
};

export const logout = (_req: Request, res: Response) => {
  res.cookie('jwt', '', {
    httpOnly: true,
    expires: new Date(Date.now() + 10),
    sameSite: 'lax',
    secure: isProduction,
  });

  res.status(STATUSES.SUCCESS).json({
    status: 'success',
    message: 'LOGGED_OUT',
  });
};

export const protect = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    const { token, strategy } = extractAuthToken(req);

    if (!token || !strategy) {
      next(new AppError('AUTH_ERROR_NOT_LOGGED_IN', STATUSES.UNAUTHORIZED));
      return;
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      next(new AppError('AUTH_ERROR_MISSING_SECRET', STATUSES.SERVER_ERROR));
      return;
    }

    const decoded = jwt.verify(token, secret) as DecodedToken;

    const currentUser = await User.findById(decoded.id);

    if (!currentUser) {
      next(new AppError('AUTH_ERROR_USER_NOT_FOUND', STATUSES.UNAUTHORIZED));
      return;
    }

    if (decoded.iat && currentUser.changedPasswordAfter(decoded.iat)) {
      next(new AppError('AUTH_ERROR_PASSWORD_CHANGED', STATUSES.UNAUTHORIZED));
      return;
    }

    (req as AuthenticatedRequest).user = currentUser;
    (req as AuthenticatedRequest).sessionStrategy = strategy;
    next();
  } catch (error) {
    next(error);
  }
};

export const restrictTo =
  (...roles: TUserRoleType[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    const user = (req as AuthenticatedRequest).user;

    if (!user || !roles.includes(user.role)) {
      next(new AppError('AUTH_ERROR_NOT_ALLOWED', STATUSES.FORBIDDEN));
      return;
    }

    next();
  };

export const refreshSession = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      next(new AppError('AUTH_ERROR_NOT_LOGGED_IN', STATUSES.UNAUTHORIZED));
      return;
    }

    createSendToken(
      user,
      req,
      res,
      STATUSES.SUCCESS,
      (req as AuthenticatedRequest).sessionStrategy,
    );
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
    const userId = (req as AuthenticatedRequest).user?._id;

    if (!userId) {
      next(new AppError('AUTH_ERROR_NOT_LOGGED_IN', STATUSES.UNAUTHORIZED));
      return;
    }

    const user = await User.findById(userId).select('+password');
    if (!user) {
      next(new AppError('AUTH_ERROR_USER_NOT_FOUND', STATUSES.UNAUTHORIZED));
      return;
    }

    const { current_password, new_password, new_password_confirm } =
      req.body ?? {};

    if (!current_password || !new_password || !new_password_confirm) {
      next(
        new AppError(
          'AUTH_ERROR_PASSWORD_FIELDS_REQUIRED',
          STATUSES.BAD_REQUEST,
        ),
      );
      return;
    }

    const passwordMatches = await user.comparePassword(
      current_password,
      user.password,
    );

    if (!passwordMatches) {
      next(
        new AppError('AUTH_ERROR_INVALID_CREDENTIALS', STATUSES.UNAUTHORIZED),
      );
      return;
    }

    user.password = new_password;
    user.password_confirm = new_password_confirm;
    await user.save();

    createSendToken(
      user,
      req,
      res,
      STATUSES.SUCCESS,
      (req as AuthenticatedRequest).sessionStrategy,
    );
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email } = req.body ?? {};
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

    res.status(STATUSES.SUCCESS).json({
      status: 'success',
      message: 'PASSWORD_RESET_TOKEN_CREATED',
      data: {
        resetToken,
        expiresInMinutes: PASSWORD_RESET_EXPIRY_MINUTES,
        resetUrl: getResetUrl(req, resetToken),
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
    const { password, password_confirm } = req.body ?? {};

    if (!token) {
      next(new AppError('AUTH_ERROR_TOKEN_REQUIRED', STATUSES.BAD_REQUEST));
      return;
    }

    if (!password || !password_confirm) {
      next(
        new AppError(
          'AUTH_ERROR_PASSWORD_FIELDS_REQUIRED',
          STATUSES.BAD_REQUEST,
        ),
      );
      return;
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      password_reset_token: hashedToken,
      password_reset_expires: { $gt: new Date() },
    });

    if (!user) {
      next(new AppError('AUTH_ERROR_TOKEN_INVALID', STATUSES.BAD_REQUEST));
      return;
    }

    user.password = password;
    user.password_confirm = password_confirm;
    user.password_reset_token = undefined;
    user.password_reset_expires = undefined;
    await user.save();

    createSendToken(user, req, res, STATUSES.SUCCESS);
  } catch (error) {
    next(error);
  }
};

const fetchJson = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new AppError('AUTH_ERROR_OAUTH_PROVIDER', STATUSES.UNAUTHORIZED);
  }
  return (await response.json()) as Record<string, unknown>;
};

export const googleAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const idToken = (req.body?.id_token ?? req.body?.credential) as string;
    if (!idToken) {
      next(new AppError('GOOGLE_AUTH_TOKEN_REQUIRED', STATUSES.BAD_REQUEST));
      return;
    }

    const profile = await fetchJson(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`,
    );

    const aud = profile.aud as string | undefined;
    const emailVerified =
      profile.email_verified === 'true' || profile.email_verified === true;
    const email = profile.email as string | undefined;
    const name =
      (profile.name as string | undefined) ??
      (profile.given_name as string | undefined) ??
      email?.split('@')[0] ??
      'google_user';

    if (!email || !emailVerified) {
      next(new AppError('GOOGLE_AUTH_EMAIL_REQUIRED', STATUSES.BAD_REQUEST));
      return;
    }

    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    if (googleClientId && aud && googleClientId !== aud) {
      next(new AppError('GOOGLE_AUTH_CLIENT_MISMATCH', STATUSES.UNAUTHORIZED));
      return;
    }

    const user = await findOrCreateUserByEmail(email, name, req.body?.role);
    createSendToken(user, req, res, STATUSES.SUCCESS);
  } catch (error) {
    next(error);
  }
};

export const facebookAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const accessToken = req.body?.access_token as string | undefined;
    if (!accessToken) {
      next(new AppError('FACEBOOK_AUTH_TOKEN_REQUIRED', STATUSES.BAD_REQUEST));
      return;
    }

    const appId = process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;
    if (!appId || !appSecret) {
      next(new AppError('FACEBOOK_APP_CONFIG_MISSING', STATUSES.SERVER_ERROR));
      return;
    }

    const debugData = await fetchJson(
      `https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${appId}|${appSecret}`,
    );

    const isValid = (debugData.data as Record<string, unknown> | undefined)
      ?.is_valid;
    const appMatches =
      (debugData.data as Record<string, unknown> | undefined)?.app_id === appId;

    if (!isValid || !appMatches) {
      next(new AppError('FACEBOOK_AUTH_TOKEN_INVALID', STATUSES.UNAUTHORIZED));
      return;
    }

    const profile = await fetchJson(
      `https://graph.facebook.com/me?fields=id,name,email&access_token=${accessToken}`,
    );

    const email = profile.email as string | undefined;
    const name = (profile.name as string | undefined) ?? 'facebook_user';

    if (!email) {
      next(new AppError('FACEBOOK_AUTH_EMAIL_REQUIRED', STATUSES.BAD_REQUEST));
      return;
    }

    const user = await findOrCreateUserByEmail(email, name, req.body?.role);
    createSendToken(user, req, res, STATUSES.SUCCESS);
  } catch (error) {
    next(error);
  }
};
