const express = require('express');
const router = express.Router();
const noteController = require('../controllers/note.controller');
const { noteValidator } = require('../validators/note.validator');
const validate = require('../middleware/validate.middleware');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.route('/')
  .get(noteController.getNotes)
  .post(noteValidator, validate, noteController.createNote);

router.route('/:id')
  .get(noteController.getNoteById)
  .put(noteValidator, validate, noteController.updateNote)
  .delete(noteController.deleteNote);

module.exports = router;
