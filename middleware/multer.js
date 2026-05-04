const path = require("path");
const multer = require("multer");
const fs = require("fs");

// Upload folder path
const uploadPath = path.join(__dirname, "../uploads");

// Ensure upload folder exists
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

// Allowed image types
const allowedTypes = new Set([
  "image/png",
  "image/jpeg",  // covers .jpg and .jpeg
  "image/jpg",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip"
]);


// File filter for image validation
const fileFilter = (req, file, cb) => {
  if (file.fieldname === "files") {
    return cb(null, true);
  }

  if (file.fieldname === "image" && !file.mimetype.startsWith("image/")) {
    return cb(new Error("Choose a valid image file."), false);
  }

  if (allowedTypes.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only images, PDF, text, Word, Excel, or zip files are allowed!"), false);
  }
};

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadPath),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${file.fieldname}${ext}`);
  },
});
const createFileUploadMiddleware = () => {
  const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit per file
  }).fields([
    { name: "image", maxCount: 1 },     // 1 image
    { name: "files", maxCount: 1 },  // 1 document

  ]);

  return [
    (req, res, next) => {
      upload(req, res, (err) => {
        if (err) {
          return res.status(400).json({
            error: "File upload failed",
            detail: err.message,
          });
        }

        //  Save file paths
        req.fileData = {};
        if (req.files?.image?.[0]) req.fileData.image = req.files.image[0].filename;
        if (req.files?.staff_image?.[0]) req.fileData.staff_image = req.files.staff_image[0].filename;
        if (req.files?.staff_document?.[0]) req.fileData.staff_document = req.files.staff_document[0].filename;

       
         if (req.files?.files?.[0]) {
          req.fileData.files = req.files.files[0].filename;
        }
        next();
      });
    },
  ];
};

module.exports = createFileUploadMiddleware;

