import type mongoose from 'mongoose';
import type { IClusterProjectSchema } from './projectModel.type';
import type { TUserRoleType } from './userModel.type';

export interface IFileSchema extends mongoose.Document {
  // File identification
  file_name: string; // Original filename
  stored_file_name: string; // Unique name in storage
  file_path?: string; // S3 key or GridFS ID (optional for MongoDB storage)

  // File metadata
  mime_type: string; // MIME type
  file_size: number; // Size in bytes (max 10MB for MongoDB, 100MB+ for S3)
  file_extension: string; // File extension

  // File content (for MongoDB document storage only)
  file_data?: Buffer; // File content stored as Buffer in MongoDB (max 10MB)

  // Relationships
  project_id: mongoose.Types.ObjectId; // Reference to ClusterProject
  uploaded_by: string; // Clerk user ID
  uploaded_by_name: string; // User display name

  // Storage info
  storage_type: 'mongodb' | 's3' | 'gridfs'; // Storage backend used
  bucket_name?: string; // S3 bucket name (if S3)
  storage_url?: string; // Public/private URL (for S3)

  // Access control
  is_public: boolean; // Public access flag
  access_level: 'owner' | 'investor' | 'public'; // Access level

  // File validation
  is_validated: boolean; // Virus scan status
  validation_status: 'pending' | 'valid' | 'invalid';

  // Timestamps
  uploaded_at: Date;
  deleted_at?: Date;
  expires_at?: Date; // Optional expiration

  // Soft delete
  is_deleted: boolean;

  // Versioning (optional)
  version: number;
  previous_version_id?: mongoose.Types.ObjectId;

  // Methods
  canAccessFile(
    userId: string,
    userRole: TUserRoleType,
    project: IClusterProjectSchema,
  ): Promise<boolean>;
  softDelete(): Promise<void>;
}
