import type { Document } from 'mongoose';
import type { IClusterProjectSchema } from './projectModel.type';

export interface IUserSchema extends Document {
  user_name: string;
  email: string;
  role: TUserRoleType;
  cluster_projects: Array<IClusterProjectSchema>;
  password: string;
  password_confirm: string;
  password_changed_at: Date;
  password_reset_token: string;
  password_reset_expires: Date;
  oauth_provider?: 'local' | 'google' | 'facebook';
  oauth_id?: string;
  oauth_access_token?: string;
  is_active: boolean;
  comparePassword(
    candidatePassword: string,
    userPassword: string,
  ): Promise<boolean>;
  createPasswordResetToken(): string;
  changedPasswordAfter(JWTTimestamp: number): boolean;
}

export type TUserRoleType =
  | 'investor'
  | 'cluster_owner'
  | 'cluster_god'
  | 'team_member';
