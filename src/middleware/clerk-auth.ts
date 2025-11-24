import { getAuth } from '@clerk/express';
import type { NextFunction, Request, Response } from 'express';
import User from '../model/userModel';

// Custom middleware to require authentication
export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Get authentication state from request
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized - No user ID found' });
    }

    // Get user from MongoDB using Clerk ID
    const user = await User.findOne({ clerk_id: userId });

    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }

    // Attach user to request for use in route handlers
    req.user = user;
    req.clerkUserId = userId;

    next();
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
};
