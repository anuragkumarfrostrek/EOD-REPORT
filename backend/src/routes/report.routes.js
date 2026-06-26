const express = require('express');
const router = express.Router();
const {
  listReports,
  getReport,
  getTodayReportHandler,
  getStats,
  getRecent,
  getWeekHoursHandler,
  createReportHandler,
  updateReportHandler,
  deleteReportHandler,
  generateReportText,
} = require('../controllers/report.controller');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/stats', getStats);
router.get('/recent', getRecent);
router.get('/today', getTodayReportHandler);
router.get('/week-hours', getWeekHoursHandler);
router.get('/', listReports);
router.get('/:id', getReport);
router.get('/:id/text', generateReportText);
router.post('/', createReportHandler);
router.put('/:id', updateReportHandler);
router.delete('/:id', deleteReportHandler);

module.exports = router;
