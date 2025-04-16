const ApiFeatures = require('../utils/apiFeatures');
const ErrorResponse = require('../utils/appError');

const advancedResults = (model, populate) => async (req, res, next) => {
  try {
    // Initialize ApiFeatures
    const features = new ApiFeatures(model.find(), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    if (populate) {
      features.query = features.query.populate(populate);
    }

    // Execute query
    const results = await features.query;

    res.advancedResults = {
      success: true,
      count: results.length,
      data: results
    };

    next();
  } catch (err) {
    next(new ErrorResponse(err.message, 500));
  }
};

module.exports = advancedResults;