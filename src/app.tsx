import cors from 'cors';
import type { NextFunction, Request, Response } from 'express';
import express from 'express';
import { xss } from 'express-xss-sanitizer';
import helmet from 'helmet';
import morgan from 'morgan';
import { errorController } from './controllers/errorController';
import { projectRoutes, userRoutes } from './routes';
import { STATUSES } from './utils';
import AppError from './utils/appError';

const app: express.Application = express();
// Middleware

app.use(helmet());
if (process.env.NODE_ENV === 'development') {
  // biome-ignore lint/suspicious/noConsole: console log for development mode
  console.log('Development mode');
  app.use(morgan('dev'));
} else {
  app.use(morgan('tiny'));
}

app.use(cors());
app.use(xss());

// Body parsing middleware
app.use(express.json({ limit: '10kb' }));

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
