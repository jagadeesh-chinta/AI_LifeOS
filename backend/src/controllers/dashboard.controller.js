const dashboardService = require('../services/dashboard.service');

exports.getStats = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { date } = req.query;
    const stats = await dashboardService.getDashboardStats(userId, date);
    res.status(200).json({
      success: true,
      stats
    });
  } catch (error) {
    next(error);
  }
};

exports.getTimeline = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { date } = req.query;
    const timeline = await dashboardService.getTimeline(userId, date);
    res.status(200).json({
      success: true,
      timeline
    });
  } catch (error) {
    next(error);
  }
};

exports.getRecommendations = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { date } = req.query;
    const recommendations = await dashboardService.getRecommendations(userId, date);
    res.status(200).json({
      success: true,
      recommendations
    });
  } catch (error) {
    next(error);
  }
};

exports.trackTime = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { date, secondsToAdd } = req.body;
    const totalSeconds = await dashboardService.trackActiveTime(userId, date, secondsToAdd);
    res.status(200).json({
      success: true,
      secondsTracked: totalSeconds
    });
  } catch (error) {
    next(error);
  }
};

exports.checkStreak = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { date } = req.body;
    const streak = await dashboardService.updateStreak(userId, date);
    res.status(200).json({
      success: true,
      currentStreak: streak
    });
  } catch (error) {
    next(error);
  }
};
