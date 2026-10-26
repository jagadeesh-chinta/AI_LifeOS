const connectionService = require('../services/connection.service');

exports.discoverUsers = async (req, res, next) => {
  try {
    const users = await connectionService.discoverUsers(req.user.id, {
      search: req.query.q || req.query.search || '',
      status: req.query.status || 'ALL'
    });
    res.json({ success: true, users });
  } catch (err) {
    next(err);
  }
};

exports.getUserPublicProfile = async (req, res, next) => {
  try {
    const profile = await connectionService.getUserPublicProfile(req.user.id, req.params.userId);
    res.json({ success: true, profile });
  } catch (err) {
    next(err);
  }
};

exports.sendConnectionRequest = async (req, res, next) => {
  try {
    const result = await connectionService.sendConnectionRequest(req.user.id, req.params.recipientId);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

exports.getRequests = async (req, res, next) => {
  try {
    const requests = await connectionService.getRequests(req.user.id);
    res.json({ success: true, ...requests });
  } catch (err) {
    next(err);
  }
};

exports.acceptRequest = async (req, res, next) => {
  try {
    const result = await connectionService.acceptRequest(req.user.id, req.params.connectionId);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.rejectRequest = async (req, res, next) => {
  try {
    const result = await connectionService.rejectRequest(req.user.id, req.params.connectionId);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.cancelOrDisconnect = async (req, res, next) => {
  try {
    const result = await connectionService.cancelOrDisconnect(req.user.id, req.params.connectionId);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.getAcceptedConnections = async (req, res, next) => {
  try {
    const connections = await connectionService.getAcceptedConnections(req.user.id);
    res.json({ success: true, connections });
  } catch (err) {
    next(err);
  }
};

exports.getMessages = async (req, res, next) => {
  try {
    const data = await connectionService.getMessages(req.user.id, req.params.partnerId);
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
};

exports.sendMessage = async (req, res, next) => {
  try {
    const message = await connectionService.sendMessage(
      req.user.id,
      req.params.partnerId,
      req.body.content
    );
    res.status(201).json({ success: true, message });
  } catch (err) {
    next(err);
  }
};
