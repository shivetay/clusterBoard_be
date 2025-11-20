import type { IUserSchema } from '../../model/types';

declare global {
  namespace Express {
    interface Request {
      user?: IUserSchema;
      authStrategy?: 'jwt' | 'cookie';
    }
  }
}
