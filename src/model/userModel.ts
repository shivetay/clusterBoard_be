import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import validator from 'validator';
import type { IUserSchema } from './types';

const MIN_USER_NAME_LENGTH = 3;
const MAX_USER_NAME_LENGTH = 20;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 20;

const userSchema = new mongoose.Schema<IUserSchema>(
  {
    user_name: {
      type: String,
      required: [true, 'Please provide a username'],
      unique: true,
      trim: true,
      minlength: [
        MIN_USER_NAME_LENGTH,
        'Username must be at least 3 characters long',
      ],
      maxlength: [
        MAX_USER_NAME_LENGTH,
        'Username must be less than 20 characters long',
      ],
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      trim: true,
      lowercase: true,
      validate: [validator.isEmail, 'Please provide a valid email'],
    },
    role: {
      type: String,
      enum: ['investor', 'cluster_owner', 'cluster_god', 'team_member'],
      default: 'cluster_owner',
    },
    password: {
      type: String,
      required: function (this: IUserSchema) {
        return this.oauth_provider === 'local' || !this.oauth_provider;
      },
      minlength: [
        MIN_PASSWORD_LENGTH,
        'Password must be at least 8 characters long',
      ],
      maxlength: [
        MAX_PASSWORD_LENGTH,
        'Password must be less than 20 characters long',
      ],
      select: false,
    },
    password_confirm: {
      type: String,
      required: function (this: IUserSchema) {
        return this.oauth_provider === 'local' || !this.oauth_provider;
      },
      validate: {
        validator: function (this: IUserSchema, value: string) {
          return value === this.password;
        },
        message: 'Passwords do not match',
      },
    },
    password_changed_at: {
      type: Date,
    },
    password_reset_token: {
      type: String,
      default: null,
    },
    password_reset_expires: {
      type: Date,
      default: null,
    },
    oauth_provider: {
      type: String,
      enum: ['local', 'google', 'facebook'],
      default: 'local',
    },
    oauth_id: {
      type: String,
      default: null,
    },
    oauth_access_token: {
      type: String,
      default: null,
      select: false,
    },
    is_active: {
      type: Boolean,
      default: true,
      select: false,
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
  localField: '_id',
  justOne: false,
});

// Password compare and hash
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
    return;
  }

  try {
    const saltRounds = 12;
    this.password = await bcrypt.hash(this.password, saltRounds);
    this.password_confirm = '';
    next();
  } catch (error) {
    next(error as Error);
  }
});

userSchema.methods.comparePassword = async (
  candidatePassword: string,
  userPassword: string,
) => {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp: number) {
  if (this.password_changed_at) {
    const changedTimestamp = Math.floor(
      this.password_changed_at.getTime() / 1000,
    );
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.password_reset_token = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.password_reset_expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  return resetToken;
};

userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) {
    return next();
  }
  this.password_changed_at = new Date(Date.now() - 1000);
  next();
});

const User = mongoose.model<IUserSchema>('User', userSchema);

export default User;
