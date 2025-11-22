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
import { clerkWebhookRouter, projectRoutes, userRoutes } from './routes';
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

app.use(clerkMiddleware());

// Webhook routes MUST be before express.json() to get raw body for signature verification
app.use(
  '/api/v1/webhooks',
  express.raw({ type: 'application/json' }),
  clerkWebhookRouter,
);

// Body parsing middleware for all other routes
app.use(express.json({ limit: '10kb' }));

app.use(
  mongoSanitize({
    replaceWith: '_',
  }),
);
app.use(cors());
app.use(xss());

// Routes
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
