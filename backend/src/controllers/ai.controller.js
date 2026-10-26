const aiScheduler = require('../services/aiScheduler.service');

exports.generateSchedule = async (req, res, next) => {
  try {
    const { date } = req.body; // e.g., '2026-10-03'
    const result = await aiScheduler.generateSchedule(req.user.id, date || new Date().toISOString().split('T')[0]);
    
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

exports.parseText = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ success: false, message: 'Text is required' });
    }
    
    const parsed = await aiScheduler.parseNaturalLanguage(text);
    res.status(200).json({ success: true, parsed });
  } catch (error) {
    next(error);
  }
};
