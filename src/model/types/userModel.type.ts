import type { Document } from 'mongoose';
import type { IClusterProjectSchema } from './projectModel.type';

export interface IUserSchema extends Document {
  user_name: string;
  email: string;
  role: TUserRoleType;
  cluster_projects: Array<IClusterProjectSchema>;
  password: string;
  password_confirm?: string;
  password_changed_at?: Date;
  password_reset_token?: string | null;
  password_reset_expires?: Date | null;
  comparePassword(
    candidatePassword: string,
    userPassword: string,
  ): Promise<boolean>;
  changedPasswordAfter(JWTTimestamp: number): boolean;
  createPasswordResetToken(): string;
}

export type TUserRoleType =
  | 'investor'
  | 'cluster_owner'
  | 'cluster_god'
  | 'team_member';
