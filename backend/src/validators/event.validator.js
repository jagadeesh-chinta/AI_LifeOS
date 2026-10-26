const { body } = require('express-validator');

exports.eventValidator = [
  body('title').notEmpty().withMessage('Title is required').trim(),
  body('start_time').notEmpty().withMessage('Must be a valid start time'),
  body('end_time').notEmpty().withMessage('Must be a valid end time'),
];

exports.eventUpdateValidator = [
  body('title').optional().notEmpty().withMessage('Title cannot be empty').trim(),
  body('start_time').optional().notEmpty().withMessage('Start time cannot be empty'),
  body('end_time').optional().notEmpty().withMessage('End time cannot be empty'),
];
