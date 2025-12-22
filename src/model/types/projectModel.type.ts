import type mongoose from 'mongoose';
import type { Document } from 'mongoose';
import type { TUserRoleType } from './userModel.type';

export interface IClusterProjectSchema extends Document {
  _id: mongoose.Types.ObjectId;
  project_name: string;
  status: TProjectStatusType;
  investors: Array<string>;
  owner: string;
  verifyOwner: (currentUserId: string, clusterRole: TUserRoleType) => void;
  addInvestor: (clerkId: string) => Promise<void>;
  removeInvestor: (clerkId: string) => Promise<void>;
  isInvestor: (clerkId: string) => boolean;
  canAccessProject: (clerkId: string, userRole: TUserRoleType) => boolean;
  canInviteEmail: (email: string) => { canInvite: boolean; reason?: string };
}

export type TProjectStatusType =
  | 'planning'
  | 'active'
  | 'completed'
  | 'on_hold'
  | 'cancelled';
