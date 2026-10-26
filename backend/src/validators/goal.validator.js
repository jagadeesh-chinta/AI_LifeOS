const { body } = require('express-validator');

exports.goalValidator = [
  body('title').notEmpty().withMessage('Title is required').trim(),
  body('target_date').optional({ nullable: true }).isISO8601().withMessage('Must be a valid date'),
  body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).withMessage('Invalid priority'),
  body('status').optional().isIn(['TODO', 'IN_PROGRESS', 'COMPLETED']).withMessage('Invalid status'),
  body('progress').optional().isInt({ min: 0, max: 100 }).withMessage('Progress must be between 0 and 100'),
];
