const preferenceService = require('../services/preference.service');

exports.getPreferences = async (req, res, next) => {
  try {
    const preferences = await preferenceService.getPreferences(req.user.id);
    res.status(200).json({ success: true, preferences });
  } catch (error) {
    next(error);
  }
};

exports.updatePreferences = async (req, res, next) => {
  try {
    const preferences = await preferenceService.updatePreferences(req.user.id, req.body);
    res.status(200).json({ success: true, preferences });
  } catch (error) {
    next(error);
  }
};
