const Post = require('../models/Post');
const Comment = require('../models/comments')
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../utils/async');

// @desc    Get all comments for a specific comment block
// @route   GET /api/v1/posts/:postId/blocks/:blockId/comments
// @access  Public
exports.getComments = asyncHandler(async (req, res, next) => {
  // Check if post exists and comments are enabled
  const post = await Post.findById(req.params.id);
  if (!post) {
    return next(new ErrorResponse('Post not found', 404));
  }
  if (!post.isCommentEnabled) {
    return next(new ErrorResponse('Comments are disabled for this post', 403));
  }

  // Check if the comment block exists
  const commentBlock = post.contentBlocks.find(
    block => block.blockId === req.params.blockId && block.blockType === 'commentSection'
  );
  if (!commentBlock) {
    return next(new ErrorResponse('Comment section not found', 404));
  }

  // Get pagination parameters
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 25;
  const skip = (page - 1) * limit;

  // Get top-level comments with pagination
  const comments = await Comment.find({
    post: req.params.postId,
    blockId: req.params.blockId,
    parentComment: null
  })
  .skip(skip)
  .limit(limit)
  .populate('user', 'name avatar')
  .sort('-createdAt');

  // Get total count for pagination
  const total = await Comment.countDocuments({
    post: req.params.postId,
    blockId: req.params.blockId,
    parentComment: null
  });

  // Recursively get replies
  const getNestedReplies = async (parentComments) => {
    return Promise.all(parentComments.map(async comment => {
      const replies = await Comment.find({ parentComment: comment._id })
        .populate('user', 'name avatar')
        .sort('createdAt');
      return {
        ...comment.toObject(),
        replies: await getNestedReplies(replies)
      };
    }));
  };

  const nestedComments = await getNestedReplies(comments);

  res.status(200).json({
    success: true,
    count: nestedComments.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    data: nestedComments
  });
});

// @desc    Add comment to a post's comment section
// @route   POST /api/v1/posts/:postId/blocks/:blockId/comments
// @access  Private
exports.addComment = asyncHandler(async (req, res, next) => {
    // console.log(req.body)
  const { text, parentComment } = req.body;

  // Validate post and comment section
  const post = await Post.findById(req.params.id);
//   console.log(post)
  if (!post) {
    return next(new ErrorResponse('Post not found', 404));
  }
  if (!post.isCommentEnabled) {
    return next(new ErrorResponse('Comments are disabled for this post', 403));
  }
// console.log(req.params.blockId)

  const commentBlock = post.contentBlocks.find(
    block => block.blockId === req.params.blockId && block.blockType === 'commentSection'
    
  );
  console.log( commentBlock)
//   console.log(commentBlock)
  if (!commentBlock) {
    return next(new ErrorResponse('Comment section not found', 404));
  }

  // Check if parent comment exists (for replies)
  if (parentComment) {
    const parentExists = await Comment.findById(parentComment);
    if (!parentExists) {
      return next(new ErrorResponse('Parent comment not found', 404));
    }
  }

  // Check if auth is required
  if (commentBlock.data.commentSettings.requireAuth && !req.user) {
    return next(new ErrorResponse('Authentication required to comment', 401));
  }

  // Create comment
  const comment = await Comment.create({
    post: req.params.id,
    blockId: req.params.blockId,
    user: req.user.id,
    text,
    parentComment: parentComment || null,
    depth: parentComment ? 1 : 0 // Simple depth tracking
  });

  // Populate user data before returning
  const populatedComment = await Comment.populate(comment, {
    path: 'user',
    select: 'name avatar'
  });

  res.status(201).json({
    success: true,
    data: populatedComment
  });
});

// @desc    Update a comment
// @route   PUT /api/v1/comments/:id
// @access  Private (owner or admin)
exports.updateComment = asyncHandler(async (req, res, next) => {
  const { text } = req.body;

  let comment = await Comment.findById(req.params.id);
  if (!comment) {
    return next(new ErrorResponse('Comment not found', 404));
  }

  // Check ownership
  if (comment.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new ErrorResponse('Not authorized to update this comment', 401));
  }

  comment.text = text || comment.text;
  comment = await comment.save();

  res.status(200).json({
    success: true,
    data: comment
  });
});

// @desc    Delete a comment
// @route   DELETE /api/v1/comments/:id
// @access  Private (owner, admin, or post author)
exports.deleteComment = asyncHandler(async (req, res, next) => {
  const comment = await Comment.findById(req.params.id);
  console.log(comment)
  if (!comment) {
    return next(new ErrorResponse('Comment not found', 404));
  }

  // Get post to check author
  const post = await Post.findById(comment.post);

  // Check permissions
  const isOwner = comment.user.toString() === req.user.id;
  const isAdmin = req.user.role === 'admin';
  const isPostAuthor = post.author.toString() === req.user.id;

  if (!isOwner && !isAdmin && !isPostAuthor) {
    return next(new ErrorResponse('Not authorized to delete this comment', 401));
  }

  // Delete the comment and all its replies
  await Comment.deleteMany({
    $or: [
      { _id: comment._id },
      { parentComment: comment._id }
    ]
  });

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Report a comment
// @route   POST /api/v1/comments/:id/report
// @access  Private
exports.reportComment = asyncHandler(async (req, res, next) => {
  const { reason } = req.body;

  const comment = await Comment.findByIdAndUpdate(
    req.params.id,
    {
      $inc: { reportCount: 1 },
      $set: { isApproved: false }, // Auto-flag for moderation
      $push: {
        reports: {
          user: req.user.id,
          reason,
          reportedAt: Date.now()
        }
      }
    },
    { new: true }
  );

  if (!comment) {
    return next(new ErrorResponse('Comment not found', 404));
  }

  res.status(200).json({
    success: true,
    data: comment
  });
});