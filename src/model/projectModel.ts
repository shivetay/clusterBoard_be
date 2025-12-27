import mongoose from 'mongoose';
import { LOCALES } from '../locales';
import { STATUSES } from '../utils';
import AppError from '../utils/appError';
import type { IClusterProjectSchema, TUserRoleType } from './types';

const PROJECT_STATUS_VALUES = [
  'w toku',
  'zakończony',
  'wstrzymany',
  'w przygotowaniu',
] as const;

const MIN_PROJECT_NAME_LENGTH = 3;
const MAX_PROJECT_NAME_LENGTH = 25;
const MIN_PROJECT_DESCRIPTION_LENGTH = 25;
const MAX_PROJECT_DESCRIPTION_LENGTH = 250;

const clusterProjectSchema = new mongoose.Schema(
  {
    project_name: {
      type: String,
      required: [true, LOCALES.PROJECT_NAME],
      trim: true,
      minlength: [MIN_PROJECT_NAME_LENGTH, LOCALES.PROJECT_NAME_MIN_LENGTH],
      maxlength: [MAX_PROJECT_NAME_LENGTH, LOCALES.PROJECT_NAME_MAX_LENGTH],
    },
    project_description: {
      type: String,
      trim: true,
      minlength: [
        MIN_PROJECT_DESCRIPTION_LENGTH,
        LOCALES.PROJECT_DESCRIPTION_MIN_LENGTH,
      ],
      maxlength: [
        MAX_PROJECT_DESCRIPTION_LENGTH,
        LOCALES.PROJECT_DESCRIPTION_MAX_LENGTH,
      ],
    },
    owner: {
      owner_id: {
        type: String,
        ref: 'User',
        required: true,
      },
      owner_name: {
        type: String,
        ref: 'User',
        required: true,
      },
    },
    investors: [
      {
        type: String,
        ref: 'User',
      },
    ],
    project_status: {
      type: String,
      default: PROJECT_STATUS_VALUES[3],
      enum: PROJECT_STATUS_VALUES,
    },
    start_date: {
      type: Date,
    },
    end_date: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

clusterProjectSchema.virtual('project_stages', {
  ref: 'ProjectStages',
  foreignField: 'cluster_project_id',
  localField: '_id',
  justOne: false,
});

clusterProjectSchema.virtual('formatted_start_date').get(function () {
  if (!this.start_date) return null;
  const date = new Date(this.start_date);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
});

clusterProjectSchema.virtual('formatted_end_date').get(function () {
  if (!this.end_date) return null;
  const date = new Date(this.end_date);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
});

clusterProjectSchema.methods.verifyOwner = function (
  currentUserId: string,
  clusterRole: TUserRoleType,
): void {
  if (clusterRole === 'cluster_god') {
    return;
  }
  // Verify the current user is the project owner
  if (this.owner.owner_id !== currentUserId) {
    throw new AppError('FORBIDDEN_NOT_PROJECT_OWNER', STATUSES.FORBIDDEN);
  }
};

// Add investor to project
clusterProjectSchema.methods.addInvestor = async function (
  clerkId: string,
): Promise<void> {
  if (this.investors.includes(clerkId)) {
    throw new AppError('INVESTOR_ALREADY_ADDED', STATUSES.BAD_REQUEST);
  }
  if (this.owner.owner_id === clerkId) {
    throw new AppError('CANNOT_ADD_OWNER_AS_INVESTOR', STATUSES.BAD_REQUEST);
  }
  this.investors.push(clerkId);
  await this.save();
};

// Remove investor from project
clusterProjectSchema.methods.removeInvestor = async function (
  clerkId: string,
): Promise<void> {
  if (!this.investors.includes(clerkId)) {
    throw new AppError('INVESTOR_NOT_FOUND', STATUSES.NOT_FOUND);
  }
  this.investors = this.investors.filter(
    (investor: string) => investor !== clerkId,
  );
  await this.save();
};

// Check if user is an investor
clusterProjectSchema.methods.isInvestor = function (clerkId: string): boolean {
  return this.investors.includes(clerkId);
};

// Check if user can access project (owner, investor, or cluster_god)
clusterProjectSchema.methods.canAccessProject = function (
  clerkId: string,
  userRole: TUserRoleType,
): boolean {
  if (userRole === 'cluster_god') {
    return true;
  }
  if (this.owner.owner_id === clerkId) {
    return true;
  }
  if (this.investors.includes(clerkId)) {
    return true;
  }
  return false;
};

// ⭐ RECOMMENDED: Check if email can be invited
clusterProjectSchema.methods.canInviteEmail = function (email: string): {
  canInvite: boolean;
  reason?: string;
} {
  const normalizedEmail = email.toLowerCase().trim();

  // Check if email belongs to owner
  if (this.owner.owner_id === normalizedEmail) {
    return { canInvite: false, reason: 'CANNOT_INVITE_PROJECT_OWNER' };
  }

  // Check if already investor
  if (this.investors.includes(normalizedEmail)) {
    return { canInvite: false, reason: 'INVESTOR_ALREADY_ADDED' };
  }

  return { canInvite: true };
};

const ClusterProject = mongoose.model<IClusterProjectSchema>(
  'ClusterProject',
  clusterProjectSchema,
);

export default ClusterProject;
