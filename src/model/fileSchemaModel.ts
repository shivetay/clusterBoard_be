import mongoose from 'mongoose';
import { LOCALES } from '../locales';
import type {
  IClusterProjectSchema,
  IFileSchema,
  TUserRoleType,
} from './types';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB for MongoDB document storage
const ALLOWED_MIME_TYPES = [
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  // Archives
  'application/zip',
  'application/x-rar-compressed',
  'application/x-tar',
  'application/gzip',
  // Text
  'text/plain',
  'text/csv',
  'text/markdown',
];

const fileSchema = new mongoose.Schema<IFileSchema>(
  {
    file_name: {
      type: String,
      required: [true, LOCALES.FILE_NAME_REQUIRED],
      trim: true,
      maxlength: [255, 'File name cannot exceed 255 characters'],
    },
    stored_file_name: {
      type: String,
      required: true,
      unique: true,
    },
    file_path: {
      type: String,
      required: false, // Optional - only needed for S3/GridFS
    },
    file_data: {
      type: Buffer,
      required: false, // Handle validation in controller based on storage_type
      select: false, // Exclude file_data from queries by default (use .select('+file_data') when needed)
    },
    mime_type: {
      type: String,
      required: true,
      enum: {
        values: ALLOWED_MIME_TYPES,
        message: 'File type not allowed',
      },
    },
    file_size: {
      type: Number,
      required: true,
      min: [1, 'File size must be greater than 0'],
      max: [
        MAX_FILE_SIZE,
        `File size cannot exceed ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      ],
    },
    file_extension: {
      type: String,
      required: true,
    },
    project_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClusterProject',
      required: [true, 'Project ID is required'],
      index: true,
      validate: {
        validator: async (value: mongoose.Types.ObjectId) => {
          const project = await mongoose
            .model('ClusterProject')
            .findById(value);
          return !!project;
        },
        message: 'Project does not exist',
      },
    },
    uploaded_by: {
      type: String,
      required: true,
      ref: 'User',
    },
    uploaded_by_name: {
      type: String,
      required: true,
    },
    storage_type: {
      type: String,
      enum: ['mongodb', 's3', 'gridfs'],
      default: 'mongodb', // Default to MongoDB document storage
    },
    bucket_name: {
      type: String,
    },
    storage_url: {
      type: String,
    },
    is_public: {
      type: Boolean,
      default: false,
    },
    access_level: {
      type: String,
      enum: ['owner', 'investor', 'public'],
      default: 'investor',
    },
    is_validated: {
      type: Boolean,
      default: false,
    },
    validation_status: {
      type: String,
      enum: ['pending', 'valid', 'invalid'],
      default: 'pending',
    },
    uploaded_at: {
      type: Date,
      default: Date.now,
    },
    deleted_at: {
      type: Date,
    },
    expires_at: {
      type: Date,
    },
    is_deleted: {
      type: Boolean,
      default: false,
    },
    version: {
      type: Number,
      default: 1,
    },
    previous_version_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'File',
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        // Don't include file_data in JSON output for security and performance
        delete ret.file_data;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (_doc, ret) => {
        delete ret.file_data;
        return ret;
      },
    },
  },
);

// Virtual to populate project relationship
fileSchema.virtual('project', {
  ref: 'ClusterProject',
  localField: 'project_id',
  foreignField: '_id',
  justOne: true,
});

// Indexes for performance
fileSchema.index({ project_id: 1, is_deleted: 1 });
fileSchema.index({ uploaded_by: 1 });
fileSchema.index({ storage_type: 1, file_path: 1 });
fileSchema.index({ uploaded_at: -1 });
fileSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });
fileSchema.index({ project_id: 1, uploaded_by: 1 }); // Compound index for query optimization

// Virtual for formatted file size
fileSchema.virtual('formatted_size').get(function () {
  const bytes = this.file_size;
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
});

// Method to check if user can access file
fileSchema.methods.canAccessFile = async function (
  userId: string,
  userRole: TUserRoleType,
  project: IClusterProjectSchema,
): Promise<boolean> {
  // Cluster god has access to everything
  if (userRole === 'cluster_god') {
    return true;
  }

  // Uploader (project owner) always has access
  if (this.uploaded_by === userId) {
    return true;
  }

  // Public files are accessible to all authenticated users
  if (this.is_public || this.access_level === 'public') {
    return true;
  }

  // Check project access - both owners and investors can access files
  if (project) {
    // Use the project's canAccessProject method which allows both owners and investors
    return project.canAccessProject(userId, userRole);
  }

  return false;
};

// Method to soft delete
fileSchema.methods.softDelete = async function (): Promise<void> {
  this.is_deleted = true;
  this.deleted_at = new Date();
  await this.save();
};

const File = mongoose.model<IFileSchema>('File', fileSchema);

export default File;
export { MAX_FILE_SIZE, ALLOWED_MIME_TYPES };
