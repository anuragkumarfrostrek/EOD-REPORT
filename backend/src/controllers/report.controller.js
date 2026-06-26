const {
  getReports,
  getReportById,
  getTodayReport,
  getWeekTotalHours,
  getDashboardStats,
  getRecentReports,
  createReport,
  updateReport,
  deleteReport,
} = require('../services/report.service');
const { formatReport } = require('../utils/formatReport');
const { calcDuration } = require('../utils/timeHelpers');

const listReports = async (req, res) => {
  try {
    const { date, project_id, search } = req.query;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;

    const { reports, totalCount } = await getReports({
      userId: req.user.id,
      date,
      projectId: project_id,
      search,
      limit,
      offset,
    });

    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      reports,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
      },
    });
  } catch (err) {
    console.error('List reports error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getReport = async (req, res) => {
  try {
    const report = await getReportById(req.params.id, req.user.id);
    if (!report) return res.status(404).json({ error: 'Report not found' });
    res.json({ report });
  } catch (err) {
    console.error('Get report error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getTodayReportHandler = async (req, res) => {
  try {
    const report = await getTodayReport(req.user.id);
    res.json({ report });
  } catch (err) {
    console.error('Today report error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getStats = async (req, res) => {
  try {
    const stats = await getDashboardStats(req.user.id);
    res.json({ stats });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getRecent = async (req, res) => {
  try {
    const reports = await getRecentReports(req.user.id, 5);
    res.json({ reports });
  } catch (err) {
    console.error('Recent reports error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getWeekHoursHandler = async (req, res) => {
  try {
    const { date } = req.query;
    const weekTotal = await getWeekTotalHours(req.user.id, date);
    res.json({ week_total_hours: weekTotal });
  } catch (err) {
    console.error('Week hours error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const createReportHandler = async (req, res) => {
  try {
    const {
      project_id,
      report_date,
      done_tasks = [],
      in_progress_tasks = [],
      blockers = [],
      sections = [],
    } = req.body;

    if ((!project_id && (!sections || sections.length === 0)) || !report_date) {
      return res.status(400).json({ error: 'project_id (or sections) and report_date are required' });
    }

    let flattenedDone = [...done_tasks];
    let flattenedIP = [...in_progress_tasks];

    if (sections && sections.length > 0) {
      flattenedDone = [];
      flattenedIP = [];
      sections.forEach((sec) => {
        const secProjectId = sec.project_id || project_id;
        if (sec.done_tasks) {
          sec.done_tasks.forEach((t) => {
            flattenedDone.push({
              ...t,
              project_id: secProjectId,
            });
          });
        }
        if (sec.in_progress_tasks) {
          sec.in_progress_tasks.forEach((t) => {
            flattenedIP.push({
              ...t,
              project_id: secProjectId,
            });
          });
        }
      });
    }

    // Calculate total hours from done tasks
    const totalHours = flattenedDone.reduce((sum, t) => {
      const dur = t.duration || calcDuration(t.start_time, t.end_time);
      return sum + dur;
    }, 0);

    // Get week total (current week including this report)
    const weekTotal = await getWeekTotalHours(req.user.id, report_date);
    const weekTotalHours = weekTotal + totalHours;

    const report = await createReport({
      userId: req.user.id,
      projectId: project_id || null,
      reportDate: report_date,
      totalHours,
      weekTotalHours,
      doneTasks: flattenedDone.map((t) => ({
        ...t,
        duration: t.duration || calcDuration(t.start_time, t.end_time),
      })),
      inProgressTasks: flattenedIP,
      blockers,
    });

    res.status(201).json({ report });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A report for this date already exists' });
    }
    console.error('Create report error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateReportHandler = async (req, res) => {
  try {
    const {
      project_id,
      done_tasks = [],
      in_progress_tasks = [],
      blockers = [],
      sections = [],
    } = req.body;

    let flattenedDone = [...done_tasks];
    let flattenedIP = [...in_progress_tasks];

    if (sections && sections.length > 0) {
      flattenedDone = [];
      flattenedIP = [];
      sections.forEach((sec) => {
        const secProjectId = sec.project_id || project_id;
        if (sec.done_tasks) {
          sec.done_tasks.forEach((t) => {
            flattenedDone.push({
              ...t,
              project_id: secProjectId,
            });
          });
        }
        if (sec.in_progress_tasks) {
          sec.in_progress_tasks.forEach((t) => {
            flattenedIP.push({
              ...t,
              project_id: secProjectId,
            });
          });
        }
      });
    }

    const totalHours = flattenedDone.reduce((sum, t) => {
      const dur = t.duration || calcDuration(t.start_time, t.end_time);
      return sum + dur;
    }, 0);

    const existingReport = await getReportById(req.params.id, req.user.id);
    if (!existingReport) return res.status(404).json({ error: 'Report not found' });

    // Recalculate week total (subtract old total, add new total)
    const weekTotalBase = await getWeekTotalHours(req.user.id, existingReport.report_date);
    const weekTotalHours = weekTotalBase - existingReport.total_hours + totalHours;

    const report = await updateReport(req.params.id, req.user.id, {
      projectId: project_id || null,
      totalHours,
      weekTotalHours: Math.max(0, weekTotalHours),
      doneTasks: flattenedDone.map((t) => ({
        ...t,
        duration: t.duration || calcDuration(t.start_time, t.end_time),
      })),
      inProgressTasks: flattenedIP,
      blockers,
    });

    if (!report) return res.status(404).json({ error: 'Report not found' });
    res.json({ report });
  } catch (err) {
    console.error('Update report error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteReportHandler = async (req, res) => {
  try {
    const deleted = await deleteReport(req.params.id, req.user.id);
    if (!deleted) return res.status(404).json({ error: 'Report not found' });
    res.json({ message: 'Report deleted successfully' });
  } catch (err) {
    console.error('Delete report error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const generateReportText = async (req, res) => {
  try {
    const report = await getReportById(req.params.id, req.user.id);
    if (!report) return res.status(404).json({ error: 'Report not found' });
    const text = formatReport(report);
    res.json({ text });
  } catch (err) {
    console.error('Generate report text error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
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
};
