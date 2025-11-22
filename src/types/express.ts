import type { IUserSchema } from '../model/types/userModel.type';

declare global {
  namespace Express {
    interface Request {
      user?: IUserSchema;
      clerkUserId?: string;
    }
  }
}
