const toolsService = require('../services/dashboardTools.service');

// Travel
exports.getTravelPlans = async (req, res, next) => {
  try {
    const plans = await toolsService.getTravelPlans(req.user.id);
    res.json({ success: true, plans });
  } catch (err) {
    next(err);
  }
};

exports.createTravelPlan = async (req, res, next) => {
  try {
    const plan = await toolsService.createTravelPlan(req.user.id, req.body);
    res.status(201).json({ success: true, plan });
  } catch (err) {
    next(err);
  }
};

exports.deleteTravelPlan = async (req, res, next) => {
  try {
    await toolsService.deleteTravelPlan(req.user.id, req.params.id);
    res.json({ success: true, message: 'Travel plan deleted' });
  } catch (err) {
    next(err);
  }
};

// Timetable
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

// Budget
exports.getBudgetSummary = async (req, res, next) => {
  try {
    const { period } = req.query;
    const data = await toolsService.getBudgetSummary(req.user.id, period);
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
};

exports.createBudgetEntry = async (req, res, next) => {
  try {
    const entry = await toolsService.createBudgetEntry(req.user.id, req.body);
    res.status(201).json({ success: true, entry });
  } catch (err) {
    next(err);
  }
};

exports.deleteBudgetEntry = async (req, res, next) => {
  try {
    await toolsService.deleteBudgetEntry(req.user.id, req.params.id);
    res.json({ success: true, message: 'Budget entry deleted' });
  } catch (err) {
    next(err);
  }
};
