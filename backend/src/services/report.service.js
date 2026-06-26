const { query, getClient } = require('../config/db');
const { getWeekBounds } = require('../utils/timeHelpers');

/**
 * Get all reports for a user with optional filters
 */
const getReports = async ({ userId, date, projectId, search, limit = 10, offset = 0 }) => {
  let countSql = `
    SELECT COUNT(*) as total
    FROM reports r
    WHERE r.user_id = $1
  `;
  let sql = `
    SELECT r.*,
           COALESCE(
             (
               SELECT string_agg(p.name, ', ')
               FROM (
                 SELECT DISTINCT p.name
                 FROM (
                   SELECT project_id FROM done_tasks WHERE report_id = r.id AND project_id IS NOT NULL
                   UNION
                   SELECT project_id FROM in_progress_tasks WHERE report_id = r.id AND project_id IS NOT NULL
                 ) t
                 JOIN projects p ON t.project_id = p.id
               ) p
             ),
             p.name
           ) as project_name,
           r.total_hours, r.week_total_hours
    FROM reports r
    LEFT JOIN projects p ON r.project_id = p.id
    WHERE r.user_id = $1
  `;
  const params = [userId];
  const countParams = [userId];
  let paramIdx = 2;

  let filterSql = '';
  if (date) {
    filterSql += ` AND r.report_date = $${paramIdx}`;
    params.push(date);
    countParams.push(date);
    paramIdx++;
  }
  if (projectId) {
    filterSql += ` AND (
      r.project_id = $${paramIdx} OR
      EXISTS (SELECT 1 FROM done_tasks dt WHERE dt.report_id = r.id AND dt.project_id = $${paramIdx}) OR
      EXISTS (SELECT 1 FROM in_progress_tasks ip WHERE ip.report_id = r.id AND ip.project_id = $${paramIdx})
    )`;
    params.push(projectId);
    countParams.push(projectId);
    paramIdx++;
  }
  if (search) {
    filterSql += ` AND EXISTS (
      SELECT 1 FROM done_tasks dt WHERE dt.report_id = r.id AND dt.description ILIKE $${paramIdx}
      UNION
      SELECT 1 FROM in_progress_tasks ip WHERE ip.report_id = r.id AND ip.description ILIKE $${paramIdx}
    )`;
    params.push(`%${search}%`);
    countParams.push(`%${search}%`);
    paramIdx++;
  }

  countSql += filterSql;
  sql += filterSql;

  sql += ` ORDER BY r.report_date DESC LIMIT $${paramIdx++} OFFSET $${paramIdx}`;
  params.push(limit, offset);

  const [countResult, listResult] = await Promise.all([
    query(countSql, countParams),
    query(sql, params)
  ]);

  return {
    reports: listResult.rows,
    totalCount: parseInt(countResult.rows[0].total, 10)
  };
};

/**
 * Get a single report with all sub-items
 */
const getReportById = async (id, userId) => {
  const reportResult = await query(
    `SELECT r.*, p.name as project_name
     FROM reports r LEFT JOIN projects p ON r.project_id = p.id
     WHERE r.id = $1 AND r.user_id = $2`,
    [id, userId]
  );
  if (reportResult.rows.length === 0) return null;
  const report = reportResult.rows[0];

  const [doneTasks, inProgressTasks, blockers] = await Promise.all([
    query(`
      SELECT dt.*, p.name as project_name
      FROM done_tasks dt
      LEFT JOIN projects p ON dt.project_id = p.id
      WHERE dt.report_id = $1
      ORDER BY dt.sort_order ASC
    `, [id]),
    query(`
      SELECT ip.*, p.name as project_name
      FROM in_progress_tasks ip
      LEFT JOIN projects p ON ip.project_id = p.id
      WHERE ip.report_id = $1
      ORDER BY ip.sort_order ASC
    `, [id]),
    query('SELECT * FROM blockers WHERE report_id = $1 ORDER BY sort_order ASC', [id]),
  ]);

  // Group done and in-progress tasks by project to build sections
  const sectionsMap = {};
  
  const addSection = (projectId, projectName) => {
    const key = projectId || 'null';
    if (!sectionsMap[key]) {
      sectionsMap[key] = {
        project_id: projectId || null,
        project_name: projectName || 'Unknown',
        done_tasks: [],
        in_progress_tasks: [],
      };
    }
    return sectionsMap[key];
  };

  doneTasks.rows.forEach((task) => {
    const sec = addSection(task.project_id, task.project_name);
    sec.done_tasks.push(task);
  });

  inProgressTasks.rows.forEach((task) => {
    const sec = addSection(task.project_id, task.project_name);
    sec.in_progress_tasks.push(task);
  });

  const sections = Object.values(sectionsMap);

  return {
    ...report,
    sections,
    done_tasks: doneTasks.rows,
    in_progress_tasks: inProgressTasks.rows,
    blockers: blockers.rows,
  };
};

/**
 * Get today's report for a user
 */
const getTodayReport = async (userId) => {
  const today = new Date().toISOString().split('T')[0];
  const result = await query(
    `SELECT id FROM reports WHERE user_id = $1 AND report_date = $2`,
    [userId, today]
  );
  if (result.rows.length === 0) return null;
  return getReportById(result.rows[0].id, userId);
};

/**
 * Calculate week total hours for a user
 */
const getWeekTotalHours = async (userId, dateStr) => {
  const { monday, sunday } = getWeekBounds(dateStr);
  const result = await query(
    `SELECT COALESCE(SUM(total_hours), 0) as week_total
     FROM reports
     WHERE user_id = $1 AND report_date >= $2 AND report_date <= $3`,
    [userId, monday, sunday]
  );
  return parseInt(result.rows[0].week_total, 10);
};

/**
 * Get dashboard stats
 */
const getDashboardStats = async (userId) => {
  const today = new Date().toISOString().split('T')[0];
  const { monday, sunday } = getWeekBounds(today);

  const [totalReports, todayReport, weekHours] = await Promise.all([
    query('SELECT COUNT(*) as count FROM reports WHERE user_id = $1', [userId]),
    query('SELECT id FROM reports WHERE user_id = $1 AND report_date = $2', [userId, today]),
    query(
      `SELECT COALESCE(SUM(total_hours), 0) as week_total
       FROM reports WHERE user_id = $1 AND report_date >= $2 AND report_date <= $3`,
      [userId, monday, sunday]
    ),
  ]);

  return {
    total_reports: parseInt(totalReports.rows[0].count, 10),
    today_submitted: todayReport.rows.length > 0,
    today_report_id: todayReport.rows[0]?.id || null,
    week_total_hours: parseInt(weekHours.rows[0].week_total, 10),
  };
};

/**
 * Get recent reports (last N)
 */
const getRecentReports = async (userId, limit = 5) => {
  const result = await query(
    `SELECT r.*,
            COALESCE(
              (
                SELECT string_agg(p.name, ', ')
                FROM (
                  SELECT DISTINCT p.name
                  FROM (
                    SELECT project_id FROM done_tasks WHERE report_id = r.id AND project_id IS NOT NULL
                    UNION
                    SELECT project_id FROM in_progress_tasks WHERE report_id = r.id AND project_id IS NOT NULL
                  ) t
                  JOIN projects p ON t.project_id = p.id
                ) p
              ),
              p.name
            ) as project_name
     FROM reports r
     LEFT JOIN projects p ON r.project_id = p.id
     WHERE r.user_id = $1
     ORDER BY r.report_date DESC
     LIMIT $2`,
    [userId, limit]
  );
  return result.rows;
};

/**
 * Create a report with all sub-items in a transaction
 */
const createReport = async ({ userId, projectId, reportDate, totalHours, weekTotalHours, doneTasks, inProgressTasks, blockers }) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    let topProjectId = projectId || null;
    if (!topProjectId) {
      const firstDone = doneTasks?.find((t) => t.project_id);
      const firstIP = inProgressTasks?.find((t) => t.project_id);
      topProjectId = firstDone?.project_id || firstIP?.project_id || null;
    }

    const reportResult = await client.query(
      `INSERT INTO reports (user_id, project_id, report_date, total_hours, week_total_hours)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [userId, topProjectId, reportDate, totalHours, weekTotalHours]
    );
    const report = reportResult.rows[0];

    if (doneTasks && doneTasks.length > 0) {
      for (let i = 0; i < doneTasks.length; i++) {
        const t = doneTasks[i];
        await client.query(
          `INSERT INTO done_tasks (report_id, project_id, description, start_time, end_time, duration, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [report.id, t.project_id || topProjectId, t.description, t.start_time, t.end_time, t.duration, i]
        );
      }
    }

    if (inProgressTasks && inProgressTasks.length > 0) {
      for (let i = 0; i < inProgressTasks.length; i++) {
        const t = inProgressTasks[i];
        await client.query(
          `INSERT INTO in_progress_tasks (report_id, project_id, description, progress_status, sort_order)
           VALUES ($1, $2, $3, $4, $5)`,
          [report.id, t.project_id || topProjectId, t.description, t.progress_status, i]
        );
      }
    }

    if (blockers && blockers.length > 0) {
      for (let i = 0; i < blockers.length; i++) {
        const b = blockers[i];
        await client.query(
          `INSERT INTO blockers (report_id, description, sort_order) VALUES ($1, $2, $3)`,
          [report.id, b.description, i]
        );
      }
    }

    await client.query('COMMIT');
    return report;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Update a report (delete all sub-items and re-insert)
 */
const updateReport = async (id, userId, { projectId, totalHours, weekTotalHours, doneTasks, inProgressTasks, blockers }) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const check = await client.query(
      'SELECT id FROM reports WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    if (check.rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    let topProjectId = projectId || null;
    if (!topProjectId) {
      const firstDone = doneTasks?.find((t) => t.project_id);
      const firstIP = inProgressTasks?.find((t) => t.project_id);
      topProjectId = firstDone?.project_id || firstIP?.project_id || null;
    }

    await client.query(
      `UPDATE reports SET project_id = $1, total_hours = $2, week_total_hours = $3
       WHERE id = $4`,
      [topProjectId, totalHours, weekTotalHours, id]
    );

    await client.query('DELETE FROM done_tasks WHERE report_id = $1', [id]);
    await client.query('DELETE FROM in_progress_tasks WHERE report_id = $1', [id]);
    await client.query('DELETE FROM blockers WHERE report_id = $1', [id]);

    if (doneTasks && doneTasks.length > 0) {
      for (let i = 0; i < doneTasks.length; i++) {
        const t = doneTasks[i];
        await client.query(
          `INSERT INTO done_tasks (report_id, project_id, description, start_time, end_time, duration, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [id, t.project_id || topProjectId, t.description, t.start_time, t.end_time, t.duration, i]
        );
      }
    }

    if (inProgressTasks && inProgressTasks.length > 0) {
      for (let i = 0; i < inProgressTasks.length; i++) {
        const t = inProgressTasks[i];
        await client.query(
          `INSERT INTO in_progress_tasks (report_id, project_id, description, progress_status, sort_order)
           VALUES ($1, $2, $3, $4, $5)`,
          [id, t.project_id || topProjectId, t.description, t.progress_status, i]
        );
      }
    }

    if (blockers && blockers.length > 0) {
      for (let i = 0; i < blockers.length; i++) {
        const b = blockers[i];
        await client.query(
          `INSERT INTO blockers (report_id, description, sort_order) VALUES ($1, $2, $3)`,
          [id, b.description, i]
        );
      }
    }

    await client.query('COMMIT');
    return await getReportById(id, userId);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Delete a report
 */
const deleteReport = async (id, userId) => {
  const result = await query(
    'DELETE FROM reports WHERE id = $1 AND user_id = $2 RETURNING id',
    [id, userId]
  );
  return result.rows[0] || null;
};

module.exports = {
  getReports,
  getReportById,
  getTodayReport,
  getWeekTotalHours,
  getDashboardStats,
  getRecentReports,
  createReport,
  updateReport,
  deleteReport,
};
