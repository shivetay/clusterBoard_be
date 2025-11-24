import type { Document } from 'mongoose';
import type { TUserRoleType } from './userModel.type';

export interface IClusterProjectSchema extends Document {
  project_name: string;
  status: TProjectStatusType;
  investors: Array<string>;
  owner: string;
  verifyOwner: (currentUserId: string, clusterRole: TUserRoleType) => void;
}

export type TProjectStatusType =
  | 'planning'
  | 'active'
  | 'completed'
  | 'on_hold'
  | 'cancelled';
