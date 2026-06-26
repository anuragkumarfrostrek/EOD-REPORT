/**
 * Client-side report text formatter
 * Mirrors backend formatReport.js exactly
 */

const minutesToDisplay = (minutes) => {
  if (!minutes || minutes <= 0) return '0h 0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
};

const formatDateDisplay = (dateStr) => {
  if (!dateStr) return 'N/A';
  let normalized = '';
  if (typeof dateStr === 'string') {
    normalized = dateStr.split('T')[0];
  } else if (dateStr instanceof Date) {
    normalized = dateStr.toISOString().split('T')[0];
  }
  const date = new Date(normalized + 'T00:00:00');
  if (isNaN(date.getTime())) return 'N/A';
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
};

export const calcDuration = (startTime, endTime) => {
  if (!startTime || !endTime) return 0;
  const cleanTime = (t) => {
    let cleaned = t.trim();
    const isPM = /pm/i.test(cleaned);
    const isAM = /am/i.test(cleaned);
    cleaned = cleaned.replace(/[^\d:]/g, '');
    let [h, m] = cleaned.split(':').map(Number);
    if (isNaN(h)) h = 0;
    if (isNaN(m)) m = 0;
    if (isPM && h < 12) h += 12;
    if (isAM && h === 12) h = 0;
    return { h, m };
  };

  const start = cleanTime(startTime);
  const end = cleanTime(endTime);
  const startMins = start.h * 60 + start.m;
  let endMins = end.h * 60 + end.m;
  if (endMins < startMins) {
    endMins += 1440; // Add 24 hours for overnight shifts
  }
  return endMins - startMins;
};

export const formatReport = ({ report_date, sections = [], blockers = [], total_hours = 0, week_total_hours = 0 }) => {
  const lines = [];

  // Header
  lines.push(`*EOD Report - ${formatDateDisplay(report_date)}*`);
  lines.push('');

  // Project Sections
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
        const dur = task.duration || calcDuration(task.start_time, task.end_time);
        lines.push(`• ${task.description} | ${minutesToDisplay(dur)}`);
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
        lines.push(`• ${task.description} - ${task.progress_status || 'In Progress'}`);
      });
    }
    lines.push('');
  });

  // Blockers (shared across all projects)
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

  // Hours summary - same line
  lines.push(`Hours Today: ${minutesToDisplay(total_hours)} | Week Total: ${minutesToDisplay(week_total_hours)}`);

  return lines.join('\n');
};

export const renderFormattedReport = (text) => {
  if (!text) return null;
  const lines = text.split('\n');
  return lines.map((line, idx) => {
    const parts = line.split('*');
    const renderedLine = parts.map((part, pIdx) => {
      if (pIdx % 2 !== 0) {
        return <strong key={pIdx} style={{ fontWeight: 'bold' }}>{part}</strong>;
      }
      return part;
    });
    return (
      <span key={idx}>
        {renderedLine}
        {idx < lines.length - 1 && '\n'}
      </span>
    );
  });
};

export { minutesToDisplay, formatDateDisplay };
