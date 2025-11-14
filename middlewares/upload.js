const multer = require('multer');

// Use memory storage for Cloudinary upload
const storage = multer.memoryStorage();

// Supported file types
const SUPPORTED_TYPES = {
  // Documents
  'application/pdf': { ext: '.pdf', category: 'document' },
  'application/msword': { ext: '.doc', category: 'document' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { ext: '.docx', category: 'document' },
  'application/vnd.ms-excel': { ext: '.xls', category: 'spreadsheet' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { ext: '.xlsx', category: 'spreadsheet' },

  // Images
  'image/png': { ext: '.png', category: 'image' },
  'image/jpeg': { ext: '.jpeg', category: 'image' },
  'image/jpg': { ext: '.jpg', category: 'image' },
  'image/gif': { ext: '.gif', category: 'image' },

  // Text
  'text/plain': { ext: '.txt', category: 'text' }
};

// File filter - accept multiple document types
const fileFilter = (req, file, cb) => {
  console.log('Uploaded file mimetype:', file.mimetype);

  if (SUPPORTED_TYPES[file.mimetype]) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `File type not supported. Allowed types: PDF, Word (.doc, .docx), Excel (.xls, .xlsx), Images (.png, .jpg, .jpeg, .gif), Text (.txt)`
      ),
      false
    );
  }
};

// Create multer upload instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB limit (increased for documents)
    files: 5 // Allow up to 5 files at once
  }
});

// Helper function to get file type category
const getFileCategory = (mimetype) => {
  return SUPPORTED_TYPES[mimetype]?.category || 'unknown';
};

// Helper function to get file extension
const getFileExtension = (mimetype) => {
  return SUPPORTED_TYPES[mimetype]?.ext || '';
};

module.exports = {
  upload,
  getFileCategory,
  getFileExtension,
  SUPPORTED_TYPES
}