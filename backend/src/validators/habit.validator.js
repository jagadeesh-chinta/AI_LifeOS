const { body } = require('express-validator');

exports.habitValidator = [
  body('name').notEmpty().withMessage('Name is required').trim(),
  body('frequency').optional().isIn(['DAILY', 'WEEKLY']).withMessage('Invalid frequency'),
  body('target_count').optional().isInt({ min: 1 }).withMessage('Must be at least 1'),
];

exports.logValidator = [
  body('completed_date').isISO8601().withMessage('Must be a valid date'),
  body('completed').isBoolean().withMessage('Completed must be a boolean'),
];
