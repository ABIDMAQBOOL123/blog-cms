// const ErrorResponse = require('../utils/appError');
// const asyncHandler = require('../utils/async');
// const { resizeImage } = require('../config/upload');

// // @desc    Upload photo for post
// // @route   PUT /api/v1/posts/:id/photo
// // @access  Private
// exports.uploadPostImage = asyncHandler(async (req, res, next) => {
//   if (!req.file) {
//     return next(new ErrorResponse('Please upload a file', 400));
//   }

//   const filename = await resizeImage(req.file.buffer, req.file.originalname);
//   const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${filename}`;

//   res.status(200).json({
//     success: true,
//     data: fileUrl
//   });
// });

// // @desc    Upload user avatar
// // @route   PUT /api/v1/users/:id/avatar
// // @access  Private
// exports.uploadUserAvatar = asyncHandler(async (req, res, next) => {
//   if (!req.file) {
//     return next(new ErrorResponse('Please upload a file', 400));
//   }

//   const filename = await resizeImage(req.file.buffer, req.file.originalname, 500);
//   const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${filename}`;

//   res.status(200).json({
//     success: true,
//     data: fileUrl
//   });
// });


const ErrorResponse = require('../utils/appError');
const asyncHandler = require('../utils/async');
const { resizeImage, saveVideo } = require('../config/upload');

// Image Upload Controllers (keep your existing ones)
exports.uploadPostImage = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    return next(new ErrorResponse('Please upload an image file', 400));
  }

  const filename = await resizeImage(req.file.buffer, req.file.originalname);
  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/images/${filename}`;

  res.status(200).json({
    success: true,
    data: fileUrl
  });
});

exports.uploadUserAvatar = asyncHandler(async (req, res, next) => {
    // console.log(req.file)
  if (!req.file) {
    return next(new ErrorResponse('Please upload an image file', 400));
  }

  const filename = await resizeImage(req.file.buffer, req.file.originalname);
  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/images/${filename}`;

  res.status(200).json({
    success: true,
    data: fileUrl
  });
});

// New Video Upload Controller
exports.uploadPostVideo = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    return next(new ErrorResponse('Please upload a video file', 400));
  }

  const filename = await saveVideo(req.file.buffer, req.file.originalname);
  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/videos/${filename}`;

  res.status(200).json({
    success: true,
    data: fileUrl
  });
});