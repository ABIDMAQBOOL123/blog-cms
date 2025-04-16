// const multer = require('multer');
// const path = require('path');
// const sharp = require('sharp');

// const storage = multer.memoryStorage();

// const fileFilter = (req, file, cb) => {
//   if (file.mimetype.startsWith('image')) {
//     cb(null, true);
//   } else {
//     cb(new Error('Not an image! Please upload only images.'), false);
//   }
// };

// const upload = multer({
//   storage: storage,
//   fileFilter: fileFilter,
//   limits: { fileSize: 5 * 1024 * 1024 } // 5MB
// });

// const resizeImage = async (buffer, filename, size = 800) => {
//   const newFilename = `image-${Date.now()}-${Math.round(Math.random() * 1E9)}.jpeg`;
//   await sharp(buffer)
//     .resize(size)
//     .toFormat('jpeg')
//     .jpeg({ quality: 90 })
//     .toFile(`public/uploads/${newFilename}`);
  
//   return newFilename;
// };

// module.exports = { upload, resizeImage };






const multer = require('multer');
const path = require('path');
const sharp = require('sharp');
const fs = require('fs');

// Create upload directories if they don't exist
const uploadDirs = ['public/uploads/images', 'public/uploads/videos'];
uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.mimetype.startsWith('image')) {
      cb(null, 'public/uploads/images');
    } else if (file.mimetype.startsWith('video')) {
      cb(null, 'public/uploads/videos');
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const random = Math.round(Math.random() * 1E9);
    if (file.mimetype.startsWith('image')) {
      cb(null, `image-${Date.now()}-${random}${ext}`);
    } else {
      cb(null, `video-${Date.now()}-${random}${ext}`);
    }
  }
});

// File filters
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image') || file.mimetype.startsWith('video')) {
    cb(null, true);
  } else {
    cb(new Error('Only image or video files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { 
    fileSize: 100 * 1024 * 1024 // 100MB max (for videos)
  }
});

// Image processing with Sharp (modified to work with buffer)
const processImageBuffer = async (buffer) => {
  return await sharp(buffer)
    .resize(800)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toBuffer();
};

module.exports = {
  upload,
  processImageBuffer
};