const express = require('express');
// const {
//   uploadPostImage,
//   uploadUserAvatar
// } = require('../controllers/uploadController');
const {uploadPostMedia} = require('../controllers/postController');
const { protect, authorize } = require('../middleware/auth');
const { upload } = require('../config/upload');

const router = express.Router();

// router.post('/post-image', protect, authorize('publisher', 'admin'), upload.single('image'), uploadPostImage);
router.post('/user-avatar', protect, upload.single('image'), uploadPostMedia);

module.exports = router;