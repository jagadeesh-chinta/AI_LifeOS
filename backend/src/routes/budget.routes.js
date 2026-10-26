const express = require('express');
const router = express.Router();
const controller = require('../controllers/dashboardTools.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/summary', controller.getBudgetSummary);
router.post('/entry', controller.createBudgetEntry);
router.delete('/entry/:id', controller.deleteBudgetEntry);

module.exports = router;
