// const User = require('../models/User');
// const ErrorResponse = require('../utils/appError');
// const asyncHandler = require('../utils/async');

// // @desc    Register user
// // @route   POST /api/v1/auth/register
// // @access  Public
// exports.register = asyncHandler(async (req, res, next) => {
//     console.log(req.body)
//   const { name, email, password, role } = req.body;

//   // Create user
//   const user = await User.create({
//     name,
//     email,
//     password,
//     role
//   });

//   sendTokenResponse(user, 200, res);
// });

// // @desc    Login user
// // @route   POST /api/v1/auth/login
// // @access  Public
// exports.login = asyncHandler(async (req, res, next) => {
//   const { email, password } = req.body;

//   // Validate email & password
//   if (!email || !password) {
//     return next(new ErrorResponse('Please provide an email and password', 400));
//   }

//   // Check for user
//   const user = await User.findOne({ email }).select('+password');

//   if (!user) {
//     return next(new ErrorResponse('Invalid credentials', 401));
//   }

//   // Check if password matches
//   const isMatch = await user.matchPassword(password);

//   if (!isMatch) {
//     return next(new ErrorResponse('Invalid credentials', 401));
//   }

//   sendTokenResponse(user, 200, res);
// });

// // Get token from model, create cookie and send response
// const sendTokenResponse = (user, statusCode, res) => {
//   // Create token
//   const token = user.getSignedJwtToken();

//   const options = {
//     expires: new Date(
//       Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
//     ),
//     httpOnly: true
//   };

//   if (process.env.NODE_ENV === 'production') {
//     options.secure = true;
//   }

//   res
//     .status(statusCode)
//     .cookie('token', token, options)
//     .json({
//       success: true,
//       token
//     });
// };

// // @desc    Get current logged in user
// // @route   GET /api/v1/auth/me
// // @access  Private
// exports.getMe = asyncHandler(async (req, res, next) => {
//   const user = await User.findById(req.user.id);

//   res.status(200).json({
//     success: true,
//     data: user
//   });
// });


const User = require('../models/User');
const ErrorResponse = require('../utils/appError');
const asyncHandler = require('../utils/async');
const nodemailer = require('nodemailer');
const validator = require('validator');
const jwt = require('jsonwebtoken');

// Create reusable transporter object using SMTP transport
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// @desc    Register user with email verification
// @route   POST /api/v1/auth/register
// @access  Public
exports.register = asyncHandler(async (req, res, next) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    return next(new ErrorResponse('Please provide name, email and password', 400));
  }

  if (!validator.isEmail(email)) {
    return next(new ErrorResponse('Please provide a valid email address', 400));
  }

  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(password)) {
    return next(new ErrorResponse(
      'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.',
      400
    ));
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new ErrorResponse('Email already in use', 400));
  }

  const user = await User.create({
    name,
    email,
    password,
    role,
    isVerified: false
  });

  // Generate JWT token for email verification
  const verificationToken = jwt.sign(
    { id: user._id },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  const verificationUrl = `${req.protocol}://${req.get('host')}/api/v1/auth/verify/${verificationToken}`;

  const mailOptions = {
    from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
    to: user.email,
    subject: 'Please verify your email',
    html: `
      <h2>Welcome to Our Platform!</h2>
      <p>Please click the link below to verify your email address:</p>
      <a href="${verificationUrl}">Verify Email</a>
      <p>This link will expire in 24 hours.</p>
    `
  };

  await transporter.sendMail(mailOptions);

  sendTokenResponse(user, 201, res, 'Registration successful. Please check your email for verification.');
});

// @desc    Verify email
// @route   GET /api/v1/auth/verify/:token
// @access  Public
exports.verifyEmail = asyncHandler(async (req, res, next) => {
  let decoded;
  try {
    decoded = jwt.verify(req.params.token, process.env.JWT_SECRET);
  } catch (err) {
    return next(new ErrorResponse('Invalid or expired verification token', 400));
  }

  const user = await User.findById(decoded.id);

  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  if (user.isVerified) {
    return res.status(200).json({
      success: true,
      message: 'Email is already verified'
    });
  }

  user.isVerified = true;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Email verification successful',
    data: {
      name: user.name,
      email: user.email
    }
  });
});

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new ErrorResponse('Please provide an email and password', 400));
  }

  if (!validator.isEmail(email)) {
    return next(new ErrorResponse('Please provide a valid email address', 400));
  }

  const user = await User.findOne({ email }).select('+password +isVerified');

  if (!user) {
    return next(new ErrorResponse('Invalid credentials', 401));
  }

  const isMatch = await user.matchPassword(password);

  if (!isMatch) {
    return next(new ErrorResponse('Invalid credentials', 401));
  }

  if (!user.isVerified) {
    return next(new ErrorResponse('Please verify your email first', 401));
  }

  sendTokenResponse(user, 200, res, 'Login successful');
});

// @desc    Get current logged in user
// @route   GET /api/v1/auth/me
// @access  Private
exports.getMe = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id).select('-password');

  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Forgot password
// @route   POST /api/v1/auth/forgotpassword
// @access  Public
exports.forgotPassword = asyncHandler(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new ErrorResponse('No user with that email exists', 404));
  }

  const resetToken = user.getResetPasswordToken();
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${req.protocol}://${req.get('host')}/api/v1/auth/resetpassword/${resetToken}`;

  const mailOptions = {
    from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
    to: user.email,
    subject: 'Password Reset Request',
    html: `
      <h2>Password Reset Request</h2>
      <p>You are receiving this email because you requested a password reset.</p>
      <p>Please click the link below to reset your password:</p>
      <a href="${resetUrl}">Reset Password</a>
      <p>This link will expire in 10 minutes.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({
      success: true,
      message: 'Password reset email sent'
    });
  } catch (err) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });

    return next(new ErrorResponse('Email could not be sent', 500));
  }
});

// Helper function for sending token response
const sendTokenResponse = (user, statusCode, res, message = '') => {
  const token = user.getSignedJwtToken();

  const options = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  };

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token,
      message,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
};






