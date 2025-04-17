const express = require('express');
const {
  register,
  login,
  getMe,
  verifyEmail,
  forgotPassword,
  resetPassword,
  updateDetails,
  updatePassword,
  logout
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// router.post('/register', register);
// router.post('/login', login);
// router.get('/me', protect, getMe);

router.post('/register', register);
router.post('/login', login);
router.get('/verify/:token', verifyEmail);
router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword/:resetToken', resetPassword);
router.get('/logout', logout);
// router.put('/resetpassword/:resettoken', resetPassword);

module.exports = router;




// const express = require('express');
// const {
//   register,
//   login,
//   getMe,
//   verifyEmail,
//   forgotPassword,
//   resetPassword,
//   updateDetails,
//   updatePassword,
//   logout
// } = require('../controllers/authController');
// const { protect } = require('../middleware/auth');

// const router = express.Router();

// // Public routes
// router.post('/register', register);
// router.post('/login', login);
// router.get('/verify/:token', verifyEmail);
// router.post('/forgotpassword', forgotPassword);
// router.put('/resetpassword/:resettoken', resetPassword);

// // Protected routes (require valid JWT)
// router.use(protect); // All routes below this will use protect middleware

// router.get('/me', getMe);
// router.put('/updatedetails', updateDetails);
// router.put('/updatepassword', updatePassword);
// router.get('/logout', logout);

// module.exports = router;