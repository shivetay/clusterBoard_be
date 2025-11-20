import MongoStore from 'connect-mongo';
import cors from 'cors';
import type { NextFunction, Request, Response } from 'express';
import express from 'express';
import session from 'express-session';
import { xss } from 'express-xss-sanitizer';
import helmet from 'helmet';
import morgan from 'morgan';
import passport from './config/passport';
import { errorController } from './controllers/errorController';
import { authRoutes, projectRoutes, userRoutes } from './routes';
import { STATUSES } from './utils';
import AppError from './utils/appError';

const app: express.Application = express();

// Middleware
// TODO add proper logger pino/winston
app.use(helmet());
if (process.env.NODE_ENV === 'development') {
  // biome-ignore lint/suspicious/noConsole: console log for development mode
  console.log('Development mode');
  app.use(morgan('dev'));
} else {
  app.use(morgan('tiny'));
}

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  }),
);
app.use(xss());

// Body parsing middleware
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Session configuration (for session-based auth)
const DB_CONNECTION =
  process.env.DATABASE_URL?.replace(
    '<db_userName>',
    process.env.DATABASE_USER || '',
  ).replace('<db_password>', process.env.DATABASE_PASSWORD || '') || '';

app.use(
  session({
    secret:
      process.env.SESSION_SECRET ||
      'your-session-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: DB_CONNECTION,
      touchAfter: 24 * 3600, // lazy session update (in seconds)
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // use secure cookies in production
      sameSite: 'lax',
    },
  }),
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/projects', projectRoutes);

app.use((req: Request, _res: Response, next: NextFunction) => {
  next(
    new AppError(
      `Can't find ${req.originalUrl} on this server!`,
      STATUSES.NOT_FOUND,
    ),
  );
});

app.use(errorController);

export default app;
