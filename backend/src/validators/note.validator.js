const { body } = require('express-validator');

exports.noteValidator = [
  body('title').notEmpty().withMessage('Title is required').trim(),
  body('content').optional().isString(),
  body('tags').optional().isString()
];
