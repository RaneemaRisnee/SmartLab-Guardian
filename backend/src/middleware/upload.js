const multer = require('multer');
const ApiError = require('../utils/ApiError');

const ALLOWED_EXTENSIONS = /\.(xlsx|xls|csv)$/i;

/**
 * Spreadsheet uploads are held in memory and parsed straight away - nothing is
 * written to disk, so there are no stray candidate lists left on the server.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_EXTENSIONS.test(file.originalname)) {
      return cb(ApiError.badRequest('Only .xlsx, .xls and .csv files can be imported'));
    }
    cb(null, true);
  }
});

module.exports = upload;
