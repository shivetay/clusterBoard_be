import mongoose from 'mongoose';
import { LOCALES } from '../locales';
import type { IClusterProjectSchema } from './types';

const PROJECT_STATUS_VALUES = [
  'planning',
  'active',
  'completed',
  'cancelled',
  'on_hold',
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

const ClusterProject = mongoose.model<IClusterProjectSchema>(
  'ClusterProject',
  clusterProjectSchema,
);

export default ClusterProject;
