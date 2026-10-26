const express = require('express');
const router = express.Router();
const controller = require('../controllers/timetable.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

// Saved Timetables CRUD
router.get('/saved', controller.listSavedTimetables);
router.get('/saved/:id', controller.getSavedTimetable);
router.post('/saved', controller.createSavedTimetable);
router.put('/saved/:id', controller.updateSavedTimetable);
router.post('/saved/:id/duplicate', controller.duplicateSavedTimetable);
router.delete('/saved/:id', controller.deleteSavedTimetable);

// AI & Algorithmic Generators & Validators
router.post('/ai-study/generate', controller.generateAIStudy);
router.post('/faculty/generate', controller.generateFaculty);
router.post('/validate', controller.validateConflicts);

// Legacy Timetable Entry endpoints
router.get('/', controller.getTimetables);
router.post('/', controller.createTimetableEntry);
router.delete('/:id', controller.deleteTimetableEntry);

module.exports = router;
