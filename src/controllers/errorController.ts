/** biome-ignore-all lint/style/noMagicNumbers: <status> */
import type { NextFunction, Request, Response } from 'express';
import AppError from '../utils/appError';
import type { CustomError } from '../utils/type';

const handleCastErrorDB = (err: CustomError) => {
  const path = err.path || 'field';
  const value = err.value !== undefined ? String(err.value) : 'undefined';
  const message = `Invalid ${path}: ${value}.`;
  return new AppError(message, 400);
};

const handleJWTError = () =>
  new AppError('Invalid token. Please log in again!', 401);

const sendErrorDev = (err: CustomError, res: Response) => {
  res.status(err.statusCode || 500).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorProd = (err: CustomError, res: Response) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode || 500).json({
      status: err.status,
      message: err.message,
    });

    // Programming or other unknown error: don't leak error details
  } else {
    // 1) Log error
    console.error('ERROR 💥', err);

    // 2) Send generic message
    res.status(500).json({
      status: 'error',
      message: 'GENERAL_ERROR',
    });
  }
};

export const errorController = (
  err: CustomError,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  res.setHeader('Content-Type', 'application/json');

  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err };

    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTError();

    sendErrorProd(error, res);
  }
};
