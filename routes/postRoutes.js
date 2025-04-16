// const express = require('express');

// const {
//   getPosts,
//   getPost,
//   createPost,
//   updatePost,
//   deletePost,
//   uploadPostImage
// } = require('../controllers/postController');
// const { protect, authorize } = require('../middleware/auth');
// const { upload } = require('../config/upload');


// const router = express.Router();

// router.route('/')
//   .get(getPosts)
//   .post(protect, authorize('publisher', 'admin'), createPost);

// router.route('/:id')
//   .get(getPost)
//   .put(protect, authorize('publisher', 'admin'), updatePost)
//   .delete(protect, authorize('publisher', 'admin'), deletePost);

// router.route('/:id/photo')
//   .put(protect, authorize('publisher', 'admin'), upload.single('image'), uploadPostImage);

// module.exports = router;





const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { upload } = require('../config/upload');
const {
  getPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  uploadBlockMedia,
  updateContentBlock,
  deleteContentBlock,
  toggleComments,
  getCommentStats,
  initCommentSection
  
} = require('../controllers/postController');


const {addComment, getComments, deleteComment, updateComment} = require('../controllers/commentController')
router.route('/')
  .get(getPosts)
  .post(protect, authorize('publisher', 'admin'), createPost);

router.route('/:id')
  .get(getPost)
  .put(protect, authorize('publisher', 'admin'), updatePost)
  .delete(protect, authorize('publisher', 'admin'), deletePost);

// Unified media upload route
router.route('/:id/blocks/:blockId/media')
  .put(
    protect,
    authorize('publisher', 'admin'),
    upload.single('media'),
    uploadBlockMedia
  );


  // Add or update a content block
router.route('/:id/blocks')
.put(protect, authorize('publisher', 'admin'), updateContentBlock);

// Delete a specific content block
router.route('/:id/blocks/:blockId')
  .delete(protect, authorize('publisher', 'admin'), deleteContentBlock);


  router.route('/:id/comments/toggle')
  .patch(protect, authorize('publisher', 'admin'), toggleComments);

router.route('/:id/comments/stats')
  .get(protect, authorize('publisher', 'admin'), getCommentStats);

router.route('/:id/comments/init')
  .post(protect, authorize('publisher', 'admin'), initCommentSection);

  router.route('/:id/blocks/:blockId/comments')
  .post(protect, addComment)


  router.route('/:id/comments/:id')
  .delete(protect, deleteComment)

  router.route('/:id/blocks/:blockId/comments')
  .get(protect, getComments)


module.exports = router;