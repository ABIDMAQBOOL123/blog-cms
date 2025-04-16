// const mongoose = require('mongoose');
// const slugify = require('slugify');

// const PostSchema = new mongoose.Schema({
//   title: {
//     type: String,
//     required: [true, 'Please add a title'],
//     unique: true,
//     trim: true,
//     maxlength: [200, 'Title cannot be more than 200 characters']
//   },
//   slug: String,
//   content: {
//     type: String,
//     required: [true, 'Please add content']
//   },
//   excerpt: {
//     type: String,
//     maxlength: [500, 'Excerpt cannot be more than 500 characters']
//   },
//   featuredImage: {
//     type: String
//   },
//   featuredVideo: String,
//   media: [{
//     type: String, // 'image' or 'video'
//     url: String,
//     caption: String
//   }],
//   status: {
//     type: String,
//     enum: ['draft', 'published', 'archived'],
//     default: 'draft'
//   },
//   categories: [{
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Category'
//   }],
//   tags: [String],
//   author: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     required: true
//   },
//   publishedAt: {
//     type: Date
//   },
//   seo: {
//     metaTitle: String,
//     metaDescription: String,
//     focusKeywords: [String],
//     ogImage: String
//   },
//   viewCount: {
//     type: Number,
//     default: 0
//   },
//   isCommentEnabled: {
//     type: Boolean,
//     default: true
//   },
//   createdAt: {
//     type: Date,
//     default: Date.now
//   },
//   updatedAt: {
//     type: Date
//   }
// });

// // Create slug from the title
// PostSchema.pre('save', function(next) {
//   this.slug = slugify(this.title, { lower: true, strict: true });
  
//   // Generate excerpt from content if not provided
//   if (!this.excerpt && this.content) {
//     const plainText = this.content.replace(/<[^>]*>?/gm, '');
//     this.excerpt = plainText.substring(0, 160) + (plainText.length > 160 ? '...' : '');
//   }
  
//   // Set publishedAt if status is published
//   if (this.status === 'published' && !this.publishedAt) {
//     this.publishedAt = Date.now();
//   }
  
//   this.updatedAt = Date.now();
//   next();
// });

// module.exports = mongoose.model('Post', PostSchema);




const mongoose = require('mongoose');
const slugify = require('slugify');

const PostSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a title'],
    trim: true,
    maxlength: [200, 'Title cannot be more than 200 characters']
  },
  slug: {
    type: String,
    index: true  // For faster queries (unique constraint added later)
  },
  contentBlocks: [{
    blockType: {
      type: String,
      required: true,
      enum: ['text', 'image', 'video', 'button', 'commentSection', 'divider']
    },
    data: {
      text: {
        type: String,
        required: function() { return this.blockType === 'text'; }
      },
      mediaUrl: {
        type: String,
        required: function() { 
          return this.blockType === 'image' || this.blockType === 'video'; 
        }
      },
      caption: String,
      altText: String,
      buttonText: String,
      buttonLink: String,
      buttonStyle: {
        type: String,
        enum: ['primary', 'secondary', 'outline'],
        default: 'primary'
      },
      commentSettings: {
        isNested: { type: Boolean, default: true },
        requireAuth: { type: Boolean, default: false }
      }
    },
    position: { type: Number, required: true },
    blockId: { type: String, default: () => mongoose.Types.ObjectId().toString() }
  }],
  excerpt: {
    type: String,
    maxlength: [500, 'Excerpt cannot be more than 500 characters']
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  categories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],
  tags: [String],
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  publishedAt: Date,
  seo: {
    metaTitle: String,
    metaDescription: String,
    focusKeywords: [String],
    ogImage: String
  },
  viewCount: { type: Number, default: 0 },
  isCommentEnabled: { type: Boolean, default: true }
}, {
  timestamps: true,  // Auto-manage createdAt/updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for comments
PostSchema.virtual('comments', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'post'
});

// Compound unique index: Prevent same author from duplicate posts
PostSchema.index({ author: 1, slug: 1 }, { unique: true });

// Generate slug and handle duplicates
PostSchema.pre('save', async function(next) {
  if (!this.isModified('title')) return next();

  try {
    // Generate base slug
    let slug = slugify(this.title, { lower: true, strict: true });
    
    // Check for existing slugs by the same author
    const existingPost = await this.constructor.findOne({
      author: this.author,
      slug: new RegExp(`^${slug}(-\\d+)?$`, 'i')  // Matches slug or slug-123
    });

    // Append counter if duplicate exists
    if (existingPost) {
      const lastDigitMatch = existingPost.slug.match(/-(\d+)$/);
      const counter = lastDigitMatch ? parseInt(lastDigitMatch[1]) + 1 : 2;
      slug = `${slug}-${counter}`;
    }

    this.slug = slug;

    // Auto-generate excerpt if empty
    if (!this.excerpt && this.contentBlocks?.length > 0) {
      const firstTextBlock = this.contentBlocks.find(b => b.blockType === 'text');
      if (firstTextBlock?.data?.text) {
        const plainText = firstTextBlock.data.text.replace(/<[^>]*>?/gm, '');
        this.excerpt = plainText.substring(0, 160) + (plainText.length > 160 ? '...' : '');
      }
    }

    // Set publishedAt if publishing for first time
    if (this.status === 'published' && !this.publishedAt) {
      this.publishedAt = new Date();
    }

    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model('Post', PostSchema);