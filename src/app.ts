// Import type definitions first to ensure they're loaded
import './types/express';
import { clerkMiddleware } from '@clerk/express';
import cors from 'cors';
import type { NextFunction, Request, Response } from 'express';
import express from 'express';
import mongoSanitize from 'express-mongo-sanitize';
import { xss } from 'express-xss-sanitizer';
import helmet from 'helmet';
import morgan from 'morgan';
import { errorController } from './controllers/errorController';
import {
  clerkWebhookRouter,
  invitationRoutes,
  projectRoutes,
  stageRoutes,
  tasksRoutes,
  userRoutes,
} from './routes';
import { STATUSES } from './utils';
import AppError from './utils/appError';

const app: express.Application = express();

// Middleware
// CORS configuration (should be as early as possible)
const normalizeOrigin = (o: string) => o.trim().replace(/\/$/, '');
const allowedOrigins = (
  process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3000', 'https://cluster-board.vercel.app']
).map(normalizeOrigin);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const normalized = normalizeOrigin(origin);

      if (allowedOrigins.includes(normalized)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// TODO add proper logger pino/winston
app.use(helmet());
if (process.env.NODE_ENV === 'development') {
  // biome-ignore lint/suspicious/noConsole: console log for development mode
  console.log('Development mode');
  app.use(morgan('dev'));
} else {
  app.use(morgan('tiny'));
}

// Webhook routes MUST be before clerkMiddleware() and express.json() to:
// 1. Bypass Clerk authentication middleware (webhooks use signature verification)
// 2. Get raw body for signature verification
app.use(
  '/api/v1/webhooks',
  express.raw({ type: 'application/json' }),
  clerkWebhookRouter,
);

// Apply Clerk middleware globally for all other routes
app.use(clerkMiddleware());

// Body parsing middleware for all other routes
app.use(express.json({ limit: '10kb' }));

app.use(
  mongoSanitize({
    replaceWith: '_',
  }),
);

app.use(xss());

// Routes
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/projects', projectRoutes);
app.use('/api/v1/tasks', tasksRoutes);
app.use('/api/v1/stages', stageRoutes);
app.use('/api/v1/invitations', invitationRoutes);

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
