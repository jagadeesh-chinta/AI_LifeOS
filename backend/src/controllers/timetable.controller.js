const timetableService = require('../services/timetable.service');
const toolsService = require('../services/dashboardTools.service');

// 1. Saved Timetables CRUD
exports.listSavedTimetables = async (req, res, next) => {
  try {
    const { type } = req.query;
    const timetables = await timetableService.getSavedTimetables(req.user.id, type);
    res.json({ success: true, timetables });
  } catch (err) {
    next(err);
  }
};

exports.getSavedTimetable = async (req, res, next) => {
  try {
    const timetable = await timetableService.getSavedTimetableById(req.user.id, req.params.id);
    res.json({ success: true, timetable });
  } catch (err) {
    next(err);
  }
};

exports.createSavedTimetable = async (req, res, next) => {
  try {
    const timetable = await timetableService.createSavedTimetable(req.user.id, req.body);
    res.status(201).json({ success: true, timetable });
  } catch (err) {
    next(err);
  }
};

exports.updateSavedTimetable = async (req, res, next) => {
  try {
    const timetable = await timetableService.updateSavedTimetable(req.user.id, req.params.id, req.body);
    res.json({ success: true, timetable });
  } catch (err) {
    next(err);
  }
};

exports.duplicateSavedTimetable = async (req, res, next) => {
  try {
    const timetable = await timetableService.duplicateSavedTimetable(req.user.id, req.params.id);
    res.status(201).json({ success: true, timetable });
  } catch (err) {
    next(err);
  }
};

exports.deleteSavedTimetable = async (req, res, next) => {
  try {
    const result = await timetableService.deleteSavedTimetable(req.user.id, req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// 2. Generators & Validators
exports.generateAIStudy = async (req, res, next) => {
  try {
    const result = await timetableService.generateAIStudyTimetable(req.user.id, req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

exports.generateFaculty = async (req, res, next) => {
  try {
    const result = await timetableService.generateFacultyTimetable(req.user.id, req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

exports.validateConflicts = async (req, res, next) => {
  try {
    const { activities } = req.body;
    const result = timetableService.validateDailyConflicts(activities);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

// 3. Legacy compatibility endpoints
exports.getTimetables = async (req, res, next) => {
  try {
    const { day } = req.query;
    const entries = await toolsService.getTimetables(req.user.id, day);
    res.json({ success: true, entries });
  } catch (err) {
    next(err);
  }
};

exports.createTimetableEntry = async (req, res, next) => {
  try {
    const result = await toolsService.createTimetableEntry(req.user.id, req.body);
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

exports.deleteTimetableEntry = async (req, res, next) => {
  try {
    await toolsService.deleteTimetableEntry(req.user.id, req.params.id);
    res.json({ success: true, message: 'Timetable entry deleted' });
  } catch (err) {
    next(err);
  }
};
