import multer from 'multer';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '../model/fileSchemaModel';
import { STATUSES } from '../utils';
import AppError from '../utils/appError';

// Memory storage for MongoDB uploads (store file in memory as Buffer)
const storage = multer.memoryStorage();

// File filter
const fileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        `File type ${file.mimetype} not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
        STATUSES.BAD_REQUEST,
      ),
    );
  }
};

// Multer configuration
export const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE, // 10MB for MongoDB
    files: 10, // Max 10 files per request
  },
  fileFilter,
});

// Single file upload middleware
export const uploadSingle: ReturnType<typeof upload.single> =
  upload.single('file');

// Multiple files upload middleware
export const uploadMultiple: ReturnType<typeof upload.array> = upload.array(
  'files',
  10,
);
