const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const path = require('path');
const errorHandler = require('./middleware/error');

// Route files
const authRoutes = require('./routes/authRoutes');
const postRoutes = require('./routes/postRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
// const uploadRoutes = require('./routes/uploadRoutes');

const app = express();

// Set security headers
app.use(helmet());

// Enable CORS
app.use(cors());

// Cookie parser
app.use(cookieParser());

// Body parser
app.use(express.json());

// Dev logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Set static folder
// app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
// Mount routers
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/posts', postRoutes);
app.use('/api/v1/categories', categoryRoutes);
// app.use('/api/v1/upload', uploadRoutes);

// Error handler middleware
app.use(errorHandler);

module.exports = app;