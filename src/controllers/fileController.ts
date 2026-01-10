import type { NextFunction, Request, Response } from 'express';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import File from '../model/fileSchemaModel';
import ClusterProject from '../model/projectModel';
import { STATUSES } from '../utils';
import AppError from '../utils/appError';

/**
 * Upload single file (MongoDB Document Storage)
 * POST /api/v1/files/upload
 */
export const uploadFile = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.file) {
      next(new AppError('No file provided', STATUSES.BAD_REQUEST));
      return;
    }

    if (!req.user || !req.clerkUserId) {
      next(new AppError('AUTH_ERROR_USER_NOT_FOUND', STATUSES.UNAUTHORIZED));
      return;
    }

    const {
      project_id,
      access_level = 'investor',
      is_public = false,
    } = req.body;

    if (!project_id) {
      next(new AppError('Project ID is required', STATUSES.BAD_REQUEST));
      return;
    }

    // Verify project exists
    const project = await ClusterProject.findById(project_id);
    if (!project) {
      next(new AppError('PROJECT_NOT_FOUND', STATUSES.NOT_FOUND));
      return;
    }

    // Only project owner (or cluster_god) can upload files
    try {
      project.verifyOwner(req.clerkUserId, req.user.role);
    } catch {
      next(new AppError('FORBIDDEN_ONLY_OWNER_CAN_UPLOAD', STATUSES.FORBIDDEN));
      return;
    }

    // Generate unique stored filename
    const fileExtension = path.extname(req.file.originalname);
    const storedFileName = `${uuidv4()}${fileExtension}`;

    // Save file with data directly to MongoDB
    const file = await File.create({
      file_name: req.file.originalname,
      stored_file_name: storedFileName,
      file_data: req.file.buffer, // Store file content as Buffer
      mime_type: req.file.mimetype,
      file_size: req.file.size,
      file_extension: fileExtension,
      project_id,
      uploaded_by: req.clerkUserId,
      uploaded_by_name: req.user.user_name || 'Unknown',
      storage_type: 'mongodb',
      access_level,
      is_public,
    });

    res.status(STATUSES.CREATED).json({
      status: 'success',
      data: {
        file,
      },
      message: 'FILE_UPLOADED_SUCCESSFULLY',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get file by ID and stream file data (MongoDB Document Storage)
 * GET /api/v1/files/:fileId
 */
export const getFileById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user || !req.clerkUserId) {
      next(new AppError('AUTH_ERROR_USER_NOT_FOUND', STATUSES.UNAUTHORIZED));
      return;
    }

    const { fileId } = req.params;

    const file = await File.findById(fileId).select('+file_data'); // Include file_data
    if (!file || file.is_deleted) {
      next(new AppError('FILE_NOT_FOUND', STATUSES.NOT_FOUND));
      return;
    }

    // Get project for access check
    const project = await ClusterProject.findById(file.project_id);
    if (!project) {
      next(new AppError('PROJECT_NOT_FOUND', STATUSES.NOT_FOUND));
      return;
    }

    // Check access
    const canAccess = await file.canAccessFile(
      req.clerkUserId,
      req.user.role,
      project,
    );

    if (!canAccess) {
      next(new AppError('FORBIDDEN_FILE_ACCESS', STATUSES.FORBIDDEN));
      return;
    }

    // Stream file data from MongoDB
    res.setHeader('Content-Type', file.mime_type);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.file_name}"`,
    );
    res.setHeader('Content-Length', file.file_size);

    if (file.storage_type === 'mongodb' && file.file_data) {
      res.send(file.file_data);
    } else {
      next(new AppError('File data not found', STATUSES.NOT_FOUND));
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Get file metadata (without file data)
 * GET /api/v1/files/:fileId/metadata
 */
export const getFileMetadata = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user || !req.clerkUserId) {
      next(new AppError('AUTH_ERROR_USER_NOT_FOUND', STATUSES.UNAUTHORIZED));
      return;
    }

    const { fileId } = req.params;

    const file = await File.findById(fileId); // file_data excluded by default
    if (!file || file.is_deleted) {
      next(new AppError('FILE_NOT_FOUND', STATUSES.NOT_FOUND));
      return;
    }

    // Get project for access check
    const project = await ClusterProject.findById(file.project_id);
    if (!project) {
      next(new AppError('PROJECT_NOT_FOUND', STATUSES.NOT_FOUND));
      return;
    }

    // Check access
    const canAccess = await file.canAccessFile(
      req.clerkUserId,
      req.user.role,
      project,
    );

    if (!canAccess) {
      next(new AppError('FORBIDDEN_FILE_ACCESS', STATUSES.FORBIDDEN));
      return;
    }

    res.status(STATUSES.SUCCESS).json({
      status: 'success',
      data: {
        file,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload multiple files (MongoDB Document Storage)
 * POST /api/v1/files/upload-multiple
 */
export const uploadMultipleFiles = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.files || (Array.isArray(req.files) && req.files.length === 0)) {
      next(new AppError('No files provided', STATUSES.BAD_REQUEST));
      return;
    }

    if (!req.user || !req.clerkUserId) {
      next(new AppError('AUTH_ERROR_USER_NOT_FOUND', STATUSES.UNAUTHORIZED));
      return;
    }

    const {
      project_id,
      access_level = 'investor',
      is_public = false,
    } = req.body;

    if (!project_id) {
      next(new AppError('Project ID is required', STATUSES.BAD_REQUEST));
      return;
    }

    // Verify project exists
    const project = await ClusterProject.findById(project_id);
    if (!project) {
      next(new AppError('PROJECT_NOT_FOUND', STATUSES.NOT_FOUND));
      return;
    }

    // Only project owner (or cluster_god) can upload files
    try {
      project.verifyOwner(req.clerkUserId, req.user.role);
    } catch {
      next(new AppError('FORBIDDEN_ONLY_OWNER_CAN_UPLOAD', STATUSES.FORBIDDEN));
      return;
    }

    const files = Array.isArray(req.files) ? req.files : [req.files];
    const uploadedFiles = [];

    for (const fileItem of files) {
      if (!fileItem || Array.isArray(fileItem)) continue;
      const file = fileItem as Express.Multer.File;

      const fileExtension = path.extname(file.originalname);
      const storedFileName = `${uuidv4()}${fileExtension}`;

      const savedFile = await File.create({
        file_name: file.originalname,
        stored_file_name: storedFileName,
        file_data: file.buffer, // Store file content as Buffer
        mime_type: file.mimetype,
        file_size: file.size,
        file_extension: fileExtension,
        project_id,
        uploaded_by: req.clerkUserId,
        uploaded_by_name: req.user.user_name || 'Unknown',
        storage_type: 'mongodb',
        access_level,
        is_public,
      });

      uploadedFiles.push(savedFile);
    }

    res.status(STATUSES.CREATED).json({
      status: 'success',
      results: uploadedFiles.length,
      data: {
        files: uploadedFiles,
      },
      message: 'FILES_UPLOADED_SUCCESSFULLY',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all files for a project (MongoDB Document Storage)
 * GET /api/v1/files/project/:projectId
 */
export const getProjectFiles = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user || !req.clerkUserId) {
      next(new AppError('AUTH_ERROR_USER_NOT_FOUND', STATUSES.UNAUTHORIZED));
      return;
    }

    const { projectId } = req.params;

    // Verify project exists and user has access
    const project = await ClusterProject.findById(projectId);
    if (!project) {
      next(new AppError('PROJECT_NOT_FOUND', STATUSES.NOT_FOUND));
      return;
    }

    // Check access
    if (!project.canAccessProject(req.clerkUserId, req.user.role)) {
      next(new AppError('FORBIDDEN_NOT_PROJECT_ACCESS', STATUSES.FORBIDDEN));
      return;
    }

    // Get files for project - file_data excluded by default (metadata only)
    const files = await File.find({
      project_id: projectId,
      is_deleted: false,
    })
      .populate({
        path: 'project_id',
        select: 'project_name owner investors',
      })
      .sort({ uploaded_at: -1 });

    res.status(STATUSES.SUCCESS).json({
      status: 'success',
      results: files.length,
      data: {
        files,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete file (soft delete) - MongoDB Document Storage
 * DELETE /api/v1/files/:fileId
 */
export const deleteFile = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user || !req.clerkUserId) {
      next(new AppError('AUTH_ERROR_USER_NOT_FOUND', STATUSES.UNAUTHORIZED));
      return;
    }

    const { fileId } = req.params;

    const file = await File.findById(fileId);
    if (!file || file.is_deleted) {
      next(new AppError('FILE_NOT_FOUND', STATUSES.NOT_FOUND));
      return;
    }

    // Get project for access check
    const project = await ClusterProject.findById(file.project_id);
    if (!project) {
      next(new AppError('PROJECT_NOT_FOUND', STATUSES.NOT_FOUND));
      return;
    }

    // Only owner or project owner can delete
    const isProjectOwner = project.owner.owner_id === req.clerkUserId;
    const isFileUploader = file.uploaded_by === req.clerkUserId;
    const isClusterGod = req.user.role === 'cluster_god';

    if (!isFileUploader && !isProjectOwner && !isClusterGod) {
      next(new AppError('FORBIDDEN_DELETE_FILE', STATUSES.FORBIDDEN));
      return;
    }

    // Soft delete (file_data remains in database for recovery)
    await file.softDelete();

    res.status(STATUSES.SUCCESS).json({
      status: 'success',
      message: 'FILE_DELETED_SUCCESSFULLY',
    });
  } catch (error) {
    next(error);
  }
};
