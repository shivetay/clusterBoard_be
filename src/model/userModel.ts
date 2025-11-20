import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import validator from 'validator';
import type { IUserSchema } from './types';

const MIN_USER_NAME_LENGTH = 3;
const MAX_USER_NAME_LENGTH = 20;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 20;
const PASSWORD_SALT_ROUNDS = 12;
const PASSWORD_CHANGED_AT_OFFSET_MS = 1000;
const MILLISECONDS_IN_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTE_IN_MS = SECONDS_PER_MINUTE * MILLISECONDS_IN_SECOND;
const PASSWORD_RESET_TOKEN_BYTES = 32;

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
      required: [true, 'Please provide a password'],
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
      required: [true, 'Please confirm your password'],
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
    this.password = await bcrypt.hash(this.password, PASSWORD_SALT_ROUNDS);
    this.password_confirm = undefined;

    if (!this.isNew) {
      this.password_changed_at = new Date(
        Date.now() - PASSWORD_CHANGED_AT_OFFSET_MS,
      );
    }

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
  if (!this.password_changed_at) {
    return false;
  }

  const changedTimestamp = Math.floor(
    this.password_changed_at.getTime() / MILLISECONDS_IN_SECOND,
  );
  return changedTimestamp > JWTTimestamp;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto
    .randomBytes(PASSWORD_RESET_TOKEN_BYTES)
    .toString('hex');
  const hashedToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.password_reset_token = hashedToken;
  const expiresInMinutes = Number(
    process.env.PASSWORD_RESET_TOKEN_EXPIRES_IN_MINUTES ?? 10,
  );
  this.password_reset_expires = new Date(
    Date.now() + expiresInMinutes * MINUTE_IN_MS,
  );

  return resetToken;
};

const User = mongoose.model<IUserSchema>('User', userSchema);

export default User;
