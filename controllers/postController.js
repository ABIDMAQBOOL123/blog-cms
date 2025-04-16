



const Post = require('../models/Post');

const Category = require('../models/Category');
const Comment = require('../models/comments')
const ErrorResponse = require('../utils/appError');
const mongoose = require('mongoose');
const fs = require('fs');
const asyncHandler = require('../utils/async');
const ApiFeatures = require('../utils/apiFeatures');
const { processImage, processImageBuffer } = require('../config/upload');
const path = require('path');

// @desc    Get all posts
// @route   GET /api/v1/posts
// @route   GET /api/v1/categories/:categoryId/posts
// @access  Public
exports.getPosts = asyncHandler(async (req, res, next) => {
  if (req.params.categoryId) {
    const posts = await Post.find({ categories: req.params.categoryId })
      .populate('categories', 'name slug')
      .populate('author', 'name email')
      .populate({
        path: 'comments',
            match: { blockId: { $in: blockIdsFromPost } },
        populate: { path: 'user', select: 'name avatar' } // Optional: populate user inside each comment
      });
      

    return res.status(200).json({
      success: true,
      count: posts.length,
      data: posts
    });
  }

  const features = new ApiFeatures(Post.find()
    .populate('categories', 'name slug')
    .populate('author', 'name email'), req.query)
    // .populate(categoryId)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const posts = await features.query;

  res.status(200).json({
    success: true,
    count: posts.length,
    data: posts
  });
});

// @desc    Get single post
// @route   GET /api/v1/posts/:id
// @access  Public
exports.getPost = asyncHandler(async (req, res, next) => {
  const post = await Post.findById(req.params.id)
    .populate('categories', 'name slug')
    .populate('author', 'name email')
    .populate({
      path: 'comments',
          // match: { blockId: { $in: blockIdsFromPost } },
      populate: { path: 'user', select: 'name avatar' } // Optional: populate user inside each comment
    });

  if (!post) {
    return next(
      new ErrorResponse(`Post not found with id of ${req.params.id}`, 404)
    );
  }

  post.viewCount += 1;
  await post.save();
   console.log(post.comments)
  res.status(200).json({
    success: true,
    data: post
  });
});

// @desc    Create new post
// @route   POST /api/v1/posts
// @access  Private
exports.createPost = asyncHandler(async (req, res, next) => {
  console.log(req.body)
  req.body.author = req.user.id;

  // Validate content blocks if provided
  if (req.body.contentBlocks) {
    req.body.contentBlocks.forEach((block, index) => {
      block.position = index; // Ensure proper ordering
      block.blockId = block.blockId || new mongoose.Types.ObjectId().toString();
    });
  }

  if (req.body.status === 'published') {
    req.body.publishedAt = Date.now();
  }

  const post = await Post.create(req.body);

  res.status(201).json({
    success: true,
    data: post
  });
});

// @desc    Update post
// @route   PUT /api/v1/posts/:id
// @access  Private
exports.updatePost = asyncHandler(async (req, res, next) => {
  let post = await Post.findById(req.params.id);

  if (!post) {
    return next(
      new ErrorResponse(`Post not found with id of ${req.params.id}`, 404)
    );
  }

  if (post.author.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to update this post`,
        401
      )
    );
  }

  // Handle content blocks update
  if (req.body.contentBlocks) {
    req.body.contentBlocks.forEach((block, index) => {
      block.position = index;
      if (!block.blockId) {
        block.blockId = mongoose.Types.ObjectId().toString();
      }
    });
  }

  if (req.body.status === 'published' && post.status !== 'published') {
    req.body.publishedAt = Date.now();
  }

  post = await Post.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: post
  });
});

// @desc    Delete post
// @route   DELETE /api/v1/posts/:id
// @access  Private
exports.deletePost = asyncHandler(async (req, res, next) => {
  const post = await Post.findById(req.params.id);

  if (!post) {
    return next(
      new ErrorResponse(`Post not found with id of ${req.params.id}`, 404)
    );
  }

  if (post.author.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to delete this post`,
        401
      )
    );
  }

  await post.remove();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Upload media for content block
// @route   PUT /api/v1/posts/:id/blocks/:blockId/media
// @access  Private
exports.uploadBlockMedia = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    return next(new ErrorResponse('Please upload a file', 400));
  }

  const fileType = req.file.mimetype.startsWith('image') ? 'image' : 'video';
  const fileUrl = `/uploads/${fileType}s/${req.file.filename}`;
  const filePath = req.file.path;

  try {
    if (fileType === 'image') {
      await processImageBuffer(filePath);
    }

    const post = await Post.findById(req.params.id);
    if (!post) {
      return next(new ErrorResponse('Post not found', 404));
    }

    // Find and update the specific block
    const blockIndex = post.contentBlocks.findIndex(
      block => block.blockId === req.params.blockId
    );

    if (blockIndex === -1) {
      return next(new ErrorResponse('Content block not found', 404));
    }

    post.contentBlocks[blockIndex].data.mediaUrl = fileUrl;
    if (fileType === 'image') {
      post.contentBlocks[blockIndex].data.altText = req.body.altText || '';
    }
    post.contentBlocks[blockIndex].data.caption = req.body.caption || '';

    await post.save();

    res.status(200).json({
      success: true,
      data: {
        url: fileUrl,
        block: post.contentBlocks[blockIndex]
      }
    });
  } catch (err) {
    console.error('Error processing file:', err);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return next(new ErrorResponse('Error processing file', 500));
  }
});

// @desc    Add or update content block
// @route   PUT /api/v1/posts/:id/blocks
// @access  Private
exports.updateContentBlock = asyncHandler(async (req, res, next) => {
  const post = await Post.findById(req.params.id);
  
  if (!post) {
    return next(new ErrorResponse('Post not found', 404));
  }

  if (post.author.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new ErrorResponse('Not authorized', 401));
  }

  const { blockType, data, blockId, position } = req.body;
  
  if (blockId) {
    // Update existing block
    const blockIndex = post.contentBlocks.findIndex(b => b.blockId === blockId);
    if (blockIndex === -1) {
      return next(new ErrorResponse('Block not found', 404));
    }
    
    post.contentBlocks[blockIndex] = {
      blockType,
      data,
      position: position !== undefined ? position : blockIndex,
      blockId
    };
  } else {
    // Add new block
    post.contentBlocks.push({
      blockType,
      data,
      position: position !== undefined ? position : post.contentBlocks.length,
      blockId: mongoose.Types.ObjectId().toString()
    });
  }

  // Reorder blocks by position
  post.contentBlocks.sort((a, b) => a.position - b.position);
  
  await post.save();

  res.status(200).json({
    success: true,
    data: post.contentBlocks
  });
});

// @desc    Delete content block
// @route   DELETE /api/v1/posts/:id/blocks/:blockId
// @access  Private
exports.deleteContentBlock = asyncHandler(async (req, res, next) => {
  const post = await Post.findById(req.params.id);
  
  if (!post) {
    return next(new ErrorResponse('Post not found', 404));
  }

  if (post.author.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new ErrorResponse('Not authorized', 401));
  }

  await Comment.deleteMany({ post: post._id });
  await post.remove();

  res.status(200).json({
    success: true,
    data: {}
  });

  post.contentBlocks = post.contentBlocks.filter(
    block => block.blockId !== req.params.blockId
  );

  await post.save();

  res.status(200).json({
    success: true,
    data: post.contentBlocks
  });
});




exports.toggleComments = asyncHandler(async (req, res, next) => {
  const post = await Post.findById(req.params.id);

  if (!post) {
    return next(new ErrorResponse('Post not found', 404));
  }

  // Verify ownership
  if (post.author.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new ErrorResponse('Not authorized to modify this post', 401));
  }

  post.isCommentEnabled = !post.isCommentEnabled;
  await post.save();

  res.status(200).json({
    success: true,
    data: {
      isCommentEnabled: post.isCommentEnabled
    }
  });
});

// @desc    Get comment statistics for a post
// @route   GET /api/v1/posts/:id/comments/stats
// @access  Private (Author or Admin)
exports.getCommentStats = asyncHandler(async (req, res, next) => {
  const post = await Post.findById(req.params.id);
  
  if (!post) {
    return next(new ErrorResponse('Post not found', 404));
  }

  // Verify ownership
  if (post.author.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new ErrorResponse('Not authorized to view these stats', 401));
  }

  const stats = await Comment.aggregate([
    { $match: { post: post._id } },
    {
      $group: {
        _id: '$blockId',
        totalComments: { $sum: 1 },
        reportedComments: { 
          $sum: { $cond: [{ $gt: ['$reportCount', 0] }, 1, 0] } 
        },
        lastCommentDate: { $max: '$createdAt' }
      }
    }
  ]);

  res.status(200).json({
    success: true,
    data: stats
  });
});

// @desc    Initialize comment section block
// @route   POST /api/v1/posts/:id/comments/init
// @access  Private (Author or Admin)
exports.initCommentSection = asyncHandler(async (req, res, next) => {
  const { position, requireAuth = false, isNested = true } = req.body;
  
  const post = await Post.findById(req.params.id);
  if (!post) {
    return next(new ErrorResponse('Post not found', 404));
  }

  if (post.author.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new ErrorResponse('Not authorized', 401));
  }

  const newBlock = {
    blockType: 'commentSection',
    data: {
      commentSettings: {
        requireAuth,
        isNested
      }
    },
    position: position || post.contentBlocks.length,
    blockId: new mongoose.Types.ObjectId().toString()
  };

  post.contentBlocks.push(newBlock);
  await post.save();

  res.status(201).json({
    success: true,
    data: newBlock
  });
});
