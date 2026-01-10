import type { Router } from 'express';
import express from 'express';
import {
  deleteFile,
  getFileById,
  getFileMetadata,
  getProjectFiles,
  uploadFile,
  uploadMultipleFiles,
} from '../controllers/fileController';
import { requireAuth } from '../middleware/clerk-auth';
import { requireAnyAuthenticated } from '../middleware/role-check';
import { uploadMultiple, uploadSingle } from '../middleware/upload';

const router: Router = express.Router();

// Upload single file
router
  .route('/upload')
  .post(requireAuth, requireAnyAuthenticated, uploadSingle, uploadFile);

// Upload multiple files
router
  .route('/upload-multiple')
  .post(
    requireAuth,
    requireAnyAuthenticated,
    uploadMultiple,
    uploadMultipleFiles,
  );

// Get all files for a project
router
  .route('/project/:projectId')
  .get(requireAuth, requireAnyAuthenticated, getProjectFiles);

// Get file metadata (without file data)
router
  .route('/:fileId/metadata')
  .get(requireAuth, requireAnyAuthenticated, getFileMetadata);

// Download file (streams file_data from MongoDB)
router
  .route('/:fileId')
  .get(requireAuth, requireAnyAuthenticated, getFileById)
  .delete(requireAuth, requireAnyAuthenticated, deleteFile);

export default router;
