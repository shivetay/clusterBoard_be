import mongoose from 'mongoose';
import { LOCALES } from '../locales';
import { STATUSES } from '../utils';
import AppError from '../utils/appError';
import type { IClusterProjectSchema, TUserRoleType } from './types';

const PROJECT_STATUS_VALUES = [
  'planning',
  'active',
  'completed',
  'cancelled',
  'on_hold',
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
      type: String,
      ref: 'User',
      required: true,
    },
    investors: [
      {
        type: String,
        ref: 'User',
      },
    ],
    project_status: {
      type: String,
      default: PROJECT_STATUS_VALUES[0],
      enum: PROJECT_STATUS_VALUES,
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

clusterProjectSchema.methods.verifyOwner = function (
  currentUserId: string,
  clusterRole: TUserRoleType,
): void {
  if (clusterRole === 'cluster_god') {
    return;
  }
  // Verify the current user is the project owner
  if (this.owner !== currentUserId) {
    throw new AppError('FORBIDDEN_NOT_PROJECT_OWNER', STATUSES.FORBIDDEN);
  }
};

const ClusterProject = mongoose.model<IClusterProjectSchema>(
  'ClusterProject',
  clusterProjectSchema,
);

export default ClusterProject;
