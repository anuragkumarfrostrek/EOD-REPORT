const { minutesToDisplay, formatDateDisplay } = require('./timeHelpers');

/**
 * Generates the exact plain-text EOD report format.
 * Uses *text* for bold (works in Slack & WhatsApp).
 * Supports multiple project sections.
 */
const formatReport = (report) => {
  const {
    report_date,
    sections = [],          // [{ project_name, done_tasks[], in_progress_tasks[] }]
    blockers = [],
    total_hours = 0,
    week_total_hours = 0,
  } = report;

  const lines = [];

  // ── Header ─────────────────────────────────────────────
  lines.push(`*EOD Report - ${formatDateDisplay(report_date)}*`);
  lines.push('');

  // ── Project Sections ───────────────────────────────────
  sections.forEach((section) => {
    lines.push(`*Project: ${section.project_name || 'Unknown'}*`);
    lines.push('');

    // Done
    lines.push('*Done*');
    const validDone = (section.done_tasks || []).filter((t) => t.description?.trim());
    if (validDone.length === 0) {
      lines.push('• None');
    } else {
      validDone.forEach((task) => {
        lines.push(`• ${task.description} | ${minutesToDisplay(task.duration)}`);
      });
    }
    lines.push('');

    // In Progress
    lines.push('*In Progress*');
    const validIP = (section.in_progress_tasks || []).filter((t) => t.description?.trim());
    if (validIP.length === 0) {
      lines.push('• None');
    } else {
      validIP.forEach((task) => {
        lines.push(`• ${task.description} - ${task.progress_status}`);
      });
    }
    lines.push('');
  });

  // ── Blockers (shared across all projects) ──────────────
  lines.push('*Blockers*');
  const validBlockers = (blockers || []).filter((b) => b.description?.trim());
  if (validBlockers.length === 0) {
    lines.push('• None');
  } else {
    validBlockers.forEach((b) => {
      lines.push(`• ${b.description}`);
    });
  }
  lines.push('');

  // ── Hours summary — same line ──────────────────────────
  lines.push(`Hours Today: ${minutesToDisplay(total_hours)} | Week Total: ${minutesToDisplay(week_total_hours)}`);

  return lines.join('\n');
};

module.exports = { formatReport };
