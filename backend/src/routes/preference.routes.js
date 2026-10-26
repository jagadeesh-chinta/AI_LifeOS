const express = require('express');
const router = express.Router();
const preferenceController = require('../controllers/preference.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.route('/')
  .get(preferenceController.getPreferences)
  .put(preferenceController.updatePreferences);

module.exports = router;
