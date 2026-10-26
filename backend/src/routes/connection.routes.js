const express = require('express');
const router = express.Router();
const connectionController = require('../controllers/connection.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

// 1. Discovery & Public Profile
router.get('/discover', connectionController.discoverUsers);
router.get('/profile/:userId', connectionController.getUserPublicProfile);

// 2. Connection Requests
router.get('/requests', connectionController.getRequests);
router.post('/request/:recipientId', connectionController.sendConnectionRequest);
router.put('/accept/:connectionId', connectionController.acceptRequest);
router.put('/reject/:connectionId', connectionController.rejectRequest);
router.delete('/cancel/:connectionId', connectionController.cancelOrDisconnect);

// 3. Accepted Connections
router.get('/list', connectionController.getAcceptedConnections);

// 4. Encrypted Messaging
router.get('/messages/:partnerId', connectionController.getMessages);
router.post('/messages/:partnerId', connectionController.sendMessage);

module.exports = router;
