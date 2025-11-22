import type { Document } from 'mongoose';
import type { IClusterProjectSchema } from './projectModel.type';

export interface IUserSchema extends Document {
  role: TUserRoleType;
  cluster_projects: Array<IClusterProjectSchema>;
  clerk_id: string;
}

export type TUserRoleType =
  | 'investor'
  | 'cluster_owner'
  | 'cluster_god'
  | 'team_member';
