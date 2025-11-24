import type { NextFunction, Request, Response, Router } from 'express';
import express from 'express';
import { Webhook } from 'svix';
import ClusterProject from '../../model/projectModel';
import User from '../../model/userModel';
import { STATUSES } from '../../utils';
import AppError from '../../utils/appError';

const router: Router = express.Router();

// POST for Clerk mongoDB sync

router.post(
  '/register',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if the webhook is valid
      const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

      if (!WEBHOOK_SECRET) {
        next(
          new AppError('CLERK_WEBHOOK_SECRET_NOT_SET', STATUSES.BAD_REQUEST),
        );
        return;
      }

      const headers = req.headers;
      // req.body is a Buffer when using express.raw()
      const payload = req.body;

      // Type assertion needed because Express headers can have various formats
      type HeaderValue = string | string[] | undefined;
      const headerMap = headers as Record<string, HeaderValue>;

      const svix_id = headerMap['svix-id'] as string | undefined;
      const svix_timestamp = headerMap['svix-timestamp'] as string | undefined;
      const svix_signature = headerMap['svix-signature'] as string | undefined;

      if (!svix_id || !svix_timestamp || !svix_signature) {
        next(new AppError('MISSING_SVIX_HEADERS', STATUSES.BAD_REQUEST));
        return;
      }

      const wh = new Webhook(WEBHOOK_SECRET);
      let evt: any;

      try {
        // payload is already a Buffer/string from express.raw()
        evt = wh.verify(payload, {
          'svix-id': svix_id as string,
          'svix-timestamp': svix_timestamp as string,
          'svix-signature': svix_signature as string,
        });
      } catch (error) {
        next(error);
      }

      const { id, unsafe_metadata, public_metadata } = evt.data;
      if (!id || typeof id !== 'string' || id.trim() === '') {
        next(new AppError('INVALID_USER_ID', STATUSES.BAD_REQUEST));
        return;
      }
      const eventType = evt.type;
      switch (eventType) {
        case 'user.created': {
          // Create user in MongoDB (use upsert to handle race conditions)
          const newUser = await User.findOneAndUpdate(
            { clerk_id: id },
            {
              clerk_id: id,
              role:
                public_metadata?.role ||
                unsafe_metadata?.role ||
                'cluster_owner',
            },
            { upsert: true, new: true, setDefaultsOnInsert: true },
          );
          return res.status(200).json({
            message: 'User created in MongoDB',
            status: 'success',
            data: { user: newUser },
          });
        }

        case 'user.updated': {
          // Update user in MongoDB (use upsert to create if doesn't exist)
          // This handles cases where user.updated arrives before user.created
          const updatedUser = await User.findOneAndUpdate(
            { clerk_id: id },
            {
              role: public_metadata?.role || unsafe_metadata?.role,
            },
            { upsert: true, new: true, setDefaultsOnInsert: true },
          );

          if (!updatedUser) {
            return res.status(404).json({
              error: 'User not found and could not be created',
              status: 'error',
            });
          }

          return res.status(200).json({
            message: 'User updated in MongoDB',
            status: 'success',
            data: { user: updatedUser },
          });
        }

        case 'user.deleted':
          // Delete user from MongoDB
          await User.findOneAndDelete({ clerk_id: id });
          await ClusterProject.deleteMany({ owner: id });

          return res.status(200).json({ message: 'User deleted from MongoDB' });

        default:
          return res
            .status(200)
            .json({ message: `Unhandled event type: ${eventType}` });
      }
    } catch (error) {
      next(error);
    }
  },
);

export default router;
