const scheduleService = require('../services/schedule.service');
const slotChatService = require('../services/slotChat.service');

exports.saveSchedule = async (req, res, next) => {
  try {
    const schedule = await scheduleService.saveSchedule(req.user.id, req.body);
    res.status(200).json({ success: true, schedule });
  } catch (error) {
    next(error);
  }
};

exports.getSchedule = async (req, res, next) => {
  try {
    const { date } = req.params;
    const schedule = await scheduleService.getScheduleByDate(req.user.id, date);
    res.status(200).json({ success: true, schedule });
  } catch (error) {
    next(error);
  }
};

exports.updateScheduleItem = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    await scheduleService.updateScheduleItem(req.user.id, itemId, req.body);
    res.status(200).json({ success: true, message: 'Schedule item updated' });
  } catch (error) {
    next(error);
  }
};

exports.deleteSchedule = async (req, res, next) => {
  try {
    const { date } = req.params;
    const result = await scheduleService.deleteScheduleByDate(req.user.id, date);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

// Interactive Slot Chat & Timing Controls
exports.getSlotChat = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const data = await slotChatService.getSlotChat(req.user.id, itemId);
    res.status(200).json({ success: true, ...data });
  } catch (error) {
    next(error);
  }
};

exports.sendSlotChatMessage = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const { message, clientContext } = req.body;
    const result = await slotChatService.sendSlotMessage(req.user.id, itemId, message, clientContext);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

exports.updateSlotPlan = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const { actionPlan } = req.body;
    const result = await slotChatService.updateActionPlan(req.user.id, itemId, actionPlan);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

exports.adjustSlotTiming = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const result = await slotChatService.adjustSlotTiming(req.user.id, itemId, req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

exports.splitSlot = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const result = await slotChatService.splitSlot(req.user.id, itemId, req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

