import mongoose from 'mongoose';
import type { IUserSchema } from './types';

const userSchema = new mongoose.Schema<IUserSchema>(
  {
    role: {
      type: String,
      enum: ['investor', 'cluster_owner', 'cluster_god', 'team_member'],
      default: 'cluster_owner',
    },
    clerk_id: {
      type: String,
      required: true,
      unique: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// virtual populate for projects
userSchema.virtual('cluster_projects', {
  ref: 'ClusterProject',
  foreignField: 'owner',
  localField: 'clerk_id',
  justOne: false,
});

const User = mongoose.model<IUserSchema>('User', userSchema);

export default User;
