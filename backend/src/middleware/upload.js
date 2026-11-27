import multer from 'multer';

// Max allowed file size: 5 MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Allowed file types for bursary application documents
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp'
]);

const storage = multer.memoryStorage();

function fileFilter(req, file, cb) {
  if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(null, true);
  } else {
    const err = new Error('Invalid file type. Only PDF, JPG, PNG, and WebP documents are allowed.');
    err.code = 'INVALID_FILE_TYPE';
    cb(err, false);
  }
}

const uploader = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1
  },
  fileFilter
});

/**
 * Express middleware for single document upload with clean error handling
 */
export function uploadSingleDoc(fieldName = 'file') {
  const upload = uploader.single(fieldName);

  return (req, res, next) => {
    upload(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File too large. Maximum allowed size is 5 MB.' });
        }
        return res.status(400).json({ error: `Upload error: ${err.message}` });
      } else if (err) {
        return res.status(400).json({ error: err.message });
      }
      next();
    });
  };
}
