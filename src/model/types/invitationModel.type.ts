import type mongoose from 'mongoose';
import type { Document, Model } from 'mongoose';
import type { IClusterProjectSchema } from './projectModel.type';

export type TInvitationStatus =
  | 'pending'
  | 'accepted'
  | 'expired'
  | 'cancelled';
export interface IInvitationSchema extends Document {
  token: string;
  project_id: mongoose.Types.ObjectId;
  inviter_id: string;
  invitee_email: string;
  status: TInvitationStatus;
  expires_at: Date;
  accepted_at?: Date;
  message?: string;
  createdAt: Date;
  updatedAt: Date;
  project?: mongoose.Types.ObjectId;
  inviter?: mongoose.Types.ObjectId;
  isValid: () => boolean;
  accept: () => Promise<void>;
  cancel: () => Promise<void>;
  expire: () => Promise<void>;
  acceptInvitation: (
    clerkId: string,
    userEmail: string,
  ) => Promise<{
    project: IClusterProjectSchema;
    alreadyInvestor: boolean;
  }>;
}

export interface IInvitationModel extends Model<IInvitationSchema> {
  findByToken: (token: string) => Promise<IInvitationSchema | null>;
  findByProject: (projectId: string) => Promise<IInvitationSchema[]>;
  findPendingByEmail: (email: string) => Promise<IInvitationSchema[]>;
  createInvitation: (
    projectId: mongoose.Types.ObjectId,
    inviterId: string,
    inviteeEmail: string,
    message?: string,
    expiryDays?: number,
  ) => Promise<IInvitationSchema>;
}
