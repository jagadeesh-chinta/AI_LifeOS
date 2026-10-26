const { body } = require('express-validator');

function parseTimeToMinutes(timeStr) {
  if (!timeStr) return null;
  const str = timeStr.trim().toUpperCase();
  const match12 = str.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if (match12) {
    let h = parseInt(match12[1], 10);
    const m = parseInt(match12[2], 10);
    const ampm = match12[3];
    if (ampm === 'PM' && h < 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return h * 60 + m;
  }
  const match24 = str.match(/^(\d{1,2}):(\d{2})(:00)?$/);
  if (match24) {
    const h = parseInt(match24[1], 10);
    const m = parseInt(match24[2], 10);
    return h * 60 + m;
  }
  return null;
}

exports.taskValidator = [
  body('title').notEmpty().withMessage('Task title is required').trim(),
  body('task_date').optional({ nullable: true }).isDate({ format: 'YYYY-MM-DD' }).withMessage('Task date must be in YYYY-MM-DD format'),
  body('start_time').optional({ nullable: true }).isString(),
  body('end_time').optional({ nullable: true }).isString()
    .custom((endTime, { req }) => {
      if (endTime && req.body.start_time) {
        const sMins = parseTimeToMinutes(req.body.start_time);
        const eMins = parseTimeToMinutes(endTime);
        if (sMins !== null && eMins !== null && eMins <= sMins) {
          throw new Error('End time must be later than start time');
        }
      }
      return true;
    }),
  body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).withMessage('Invalid priority'),
  body('status').optional().isIn(['TODO', 'PENDING', 'COMPLETED']).withMessage('Invalid status'),
  body('due_date').optional({ nullable: true }).isISO8601().withMessage('Must be a valid date'),
  body('estimated_minutes').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Must be a positive integer'),
];

exports.updateTaskValidator = [
  body('title').optional().notEmpty().withMessage('Task title cannot be empty').trim(),
  body('task_date').optional({ nullable: true }).isDate({ format: 'YYYY-MM-DD' }).withMessage('Task date must be in YYYY-MM-DD format'),
  body('start_time').optional({ nullable: true }).isString(),
  body('end_time').optional({ nullable: true }).isString()
    .custom((endTime, { req }) => {
      if (endTime && req.body.start_time) {
        const sMins = parseTimeToMinutes(req.body.start_time);
        const eMins = parseTimeToMinutes(endTime);
        if (sMins !== null && eMins !== null && eMins <= sMins) {
          throw new Error('End time must be later than start time');
        }
      }
      return true;
    }),
  body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).withMessage('Invalid priority'),
  body('status').optional().isIn(['TODO', 'PENDING', 'COMPLETED']).withMessage('Invalid status'),
  body('due_date').optional({ nullable: true }).isISO8601().withMessage('Must be a valid date'),
  body('estimated_minutes').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Must be a positive integer'),
];

exports.parseTimeToMinutes = parseTimeToMinutes;
