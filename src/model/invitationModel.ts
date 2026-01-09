import mongoose from 'mongoose';
import { generateSecureToken } from '../services';
import { STATUSES } from '../utils';
import AppError from '../utils/appError';
import ClusterProject from './projectModel';
import type {
  IClusterProjectSchema,
  IInvitationModel,
  IInvitationSchema,
  TInvitationStatus,
} from './types';

const INVITATION_TOKEN_LENGTH = 32;
const DEFAULT_EXPIRY_DAYS = 7;

const INVITATION_STATUSES = [
  'pending',
  'accepted',
  'expired',
  'cancelled',
] as TInvitationStatus[];

const invitationSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
    },
    project_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClusterProject',
      required: true,
    },
    inviter_id: {
      type: String,
      ref: 'User',
      required: true,
    },
    invitee_email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    status: {
      type: String,
      enum: INVITATION_STATUSES,
      default: 'pending',
    },
    expires_at: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 }, // TTL index for auto-expiration
    },
    accepted_at: {
      type: Date,
    },
    message: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    email_send_failed: {
      type: Boolean,
      default: false,
    },
    last_email_error: {
      type: String,
    },
    last_email_error_at: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Virtual populate for project
invitationSchema.virtual('project', {
  ref: 'ClusterProject',
  localField: 'project_id',
  foreignField: '_id',
  justOne: true,
});

// Virtual populate for inviter
invitationSchema.virtual('inviter', {
  ref: 'User',
  localField: 'inviter_id',
  foreignField: 'clerk_id',
  justOne: true,
});

invitationSchema.methods.isValid = function () {
  return (
    this.status === 'pending' &&
    this.expires_at > new Date() &&
    !this.accepted_at
  );
};

invitationSchema.methods.accept = async function () {
  this.status = 'accepted';
  this.accepted_at = new Date();
  await this.save();
};

invitationSchema.methods.cancel = async function (): Promise<void> {
  this.status = 'cancelled';
  await this.save();
};

invitationSchema.methods.expire = async function (): Promise<void> {
  this.status = 'expired';
  await this.save();
};

invitationSchema.methods.acceptInvitation = async function (
  clerkId: string,
  userEmail: string,
): Promise<{ project: IClusterProjectSchema; alreadyInvestor: boolean }> {
  // Validate invitation status
  if (!this.isValid()) {
    if (this.status === 'accepted') {
      throw new AppError('INVITATION_ALREADY_ACCEPTED', STATUSES.BAD_REQUEST);
    }
    if (this.expires_at <= new Date()) {
      await this.expire();
      throw new AppError('INVITATION_EXPIRED', STATUSES.BAD_REQUEST);
    }
    throw new AppError('INVITATION_INVALID', STATUSES.BAD_REQUEST);
  }

  // Verify email matches (security check)
  if (userEmail.toLowerCase() !== this.invitee_email) {
    throw new AppError('INVITATION_EMAIL_MISMATCH', STATUSES.FORBIDDEN);
  }

  // Get project
  const project = await ClusterProject.findById(this.project_id);
  if (!project) {
    throw new AppError('PROJECT_NOT_FOUND', STATUSES.NOT_FOUND);
  }

  // Check if already investor
  const alreadyInvestor = project.isInvestor(clerkId);

  if (!alreadyInvestor) {
    await project.addInvestor(clerkId);
  }

  // Mark invitation as accepted
  await this.accept();

  return { project, alreadyInvestor };
};

// Static methods
invitationSchema.statics.findByToken = function (token: string) {
  return this.findOne({ token, status: 'pending' });
};

invitationSchema.statics.findByProject = function (projectId: string) {
  return this.find({ project_id: projectId }).sort({ createdAt: -1 });
};

invitationSchema.statics.findPendingByEmail = function (email: string) {
  return this.find({
    invitee_email: email.toLowerCase(),
    status: 'pending',
    expires_at: { $gt: new Date() },
  });
};

invitationSchema.statics.createInvitation = async function (
  projectId: mongoose.Types.ObjectId,
  inviterId: string,
  inviteeEmail: string,
  message?: string,
  expiryDays: number = DEFAULT_EXPIRY_DAYS,
): Promise<IInvitationSchema> {
  const normalizedEmail = inviteeEmail.toLowerCase().trim();

  // Check for existing pending invitation
  const existing = await this.findOne({
    project_id: projectId,
    invitee_email: normalizedEmail,
    status: 'pending',
    expires_at: { $gt: new Date() },
  });

  if (existing) {
    throw new AppError('PENDING_INVITATION_EXISTS', STATUSES.BAD_REQUEST);
  }

  // Generate token and calculate expiry
  const token = generateSecureToken(INVITATION_TOKEN_LENGTH);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiryDays);

  return this.create({
    token,
    project_id: projectId,
    inviter_id: inviterId,
    invitee_email: normalizedEmail,
    expires_at: expiresAt,
    message: message?.trim() || undefined,
  });
};

const Invitation = mongoose.model<IInvitationSchema, IInvitationModel>(
  'Invitation',
  invitationSchema,
);

export default Invitation;
