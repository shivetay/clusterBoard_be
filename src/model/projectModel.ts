import mongoose from 'mongoose';
import { LOCALES } from '../locales';
import type { IClusterProjectSchema } from './types';

const PROJECT_STATUS_VALUES = [
  'planning',
  'active',
  'completed',
  'cancelled',
] as const;

const MIN_PROJECT_NAME_LENGTH = 3;
const MAX_PROJECT_NAME_LENGTH = 25;

const clusterProjectSchema = new mongoose.Schema(
  {
    project_name: {
      type: String,
      required: [true, LOCALES.PROJECT_NAME],
      trim: true,
      minlength: [MIN_PROJECT_NAME_LENGTH, LOCALES.PROJECT_NAME_MIN_LENGTH],
      maxlength: [MAX_PROJECT_NAME_LENGTH, LOCALES.PROJECT_NAME_MAX_LENGTH],
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    investors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    status: {
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

clusterProjectSchema.pre('findOneAndUpdate', function (next) {
  const options = this.getOptions();
  const currentUser = options?.current_user;
  if (!currentUser) {
    return next();
  }

  // filter so only owner can update
  const filterData = this.getFilter();
  this.setQuery({ ...filterData, owner: currentUser });

  next();
});

clusterProjectSchema.pre('findOneAndDelete', function (next) {
  const options = this.getOptions();
  const currentUser = options?.current_user;
  if (!currentUser) {
    return next();
  }

  // filter so only owner can update
  const filterData = this.getFilter();
  this.setQuery({ ...filterData, owner: currentUser });

  next();
});

const ClusterProject = mongoose.model<IClusterProjectSchema>(
  'ClusterProject',
  clusterProjectSchema,
);

export default ClusterProject;
