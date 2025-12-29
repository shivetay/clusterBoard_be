import type { IClusterProjectSchema } from '../model/types';
import type { IUserSchema } from '../model/types/userModel.type';

declare global {
  namespace Express {
    interface Request {
      user?: IUserSchema;
      clerkUserId?: string;
      project?: IClusterProjectSchema;
      projectAccessLevel?: 'owner' | 'investor' | 'none';
    }
  }
}
