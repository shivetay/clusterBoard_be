import type { NextFunction, Request, Response, Router } from 'express';
import express from 'express';
import { Webhook } from 'svix';
import User from '../../model/userModel';

const router: Router = express.Router();

// POST for Clerk mongoDB sync

router.post(
  '/register',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if the webhook is valid
      const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

      if (!WEBHOOK_SECRET) {
        throw new Error('CLERK_WEBHOOK_SECRET is not set');
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
        return res.status(400).json({
          error: 'Missing svix headers',
        });
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
      } catch {
        return res.status(400).json({ error: 'Error verifying webhook' });
      }

      const { id, unsafe_metadata, public_metadata } = evt.data;
      const eventType = evt.type;
      switch (eventType) {
        case 'user.created': {
          // Create user in MongoDB
          const newUser = await User.create({
            clerk_id: id,
          });
          return res.status(200).json({
            message: 'User created in MongoDB',
            status: 'success',
            data: { user: newUser },
          });
        }

        case 'user.updated': {
          // Update user in MongoDB
          const updatedUser = await User.findOneAndUpdate(
            { clerk_id: id },
            {
              role: public_metadata?.role || unsafe_metadata?.role,
            },
            { new: true },
          );
          return res.status(200).json({
            message: 'User updated in MongoDB',
            status: 'success',
            data: { user: updatedUser },
          });
        }

        case 'user.deleted':
          // Delete user from MongoDB
          await User.findOneAndDelete({ clerk_id: id });

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
