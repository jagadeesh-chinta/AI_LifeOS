const habitService = require('../services/habit.service');

exports.createHabit = async (req, res, next) => {
  try {
    const habit = await habitService.createHabit(req.user.id, req.body);
    res.status(201).json({ success: true, habit });
  } catch (error) {
    next(error);
  }
};

exports.getHabits = async (req, res, next) => {
  try {
    const habits = await habitService.getHabits(req.user.id);
    res.status(200).json({ success: true, habits });
  } catch (error) {
    next(error);
  }
};

exports.getHabitById = async (req, res, next) => {
  try {
    const habit = await habitService.getHabitById(req.user.id, req.params.id);
    res.status(200).json({ success: true, habit });
  } catch (error) {
    next(error);
  }
};

exports.updateHabit = async (req, res, next) => {
  try {
    const habit = await habitService.updateHabit(req.user.id, req.params.id, req.body);
    res.status(200).json({ success: true, habit });
  } catch (error) {
    next(error);
  }
};

exports.deleteHabit = async (req, res, next) => {
  try {
    await habitService.deleteHabit(req.user.id, req.params.id);
    res.status(200).json({ success: true, message: 'Habit deleted successfully' });
  } catch (error) {
    next(error);
  }
};

exports.logHabit = async (req, res, next) => {
  try {
    const result = await habitService.logHabit(req.user.id, req.params.id, req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
