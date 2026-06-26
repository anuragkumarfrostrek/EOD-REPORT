/**
 * Convert total minutes to display string: e.g., 90 => "1h 30m"
 */
const minutesToDisplay = (minutes) => {
  if (!minutes || minutes <= 0) return '0h 0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
};

/**
 * Parse "HH:MM" time string and return { hours, minutes }
 */
const parseTime = (timeStr) => {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  return { hours: h, minutes: m };
};

const calcDuration = (startTime, endTime) => {
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

/**
 * Get Monday of the current week and today as YYYY-MM-DD
 */
const getWeekBounds = (dateStr) => {
  const date = dateStr ? new Date(dateStr) : new Date();
  const day = date.getDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? -6 : 1 - day; // days to subtract to get Monday
  const monday = new Date(date);
  monday.setDate(date.getDate() + diff);

  const format = (d) => d.toISOString().split('T')[0];
  return { monday: format(monday), sunday: format(date) };
};

/**
 * Format a Date object or date string to "DD Mon YYYY" (e.g., "25 May 2026")
 */
const formatDateDisplay = (dateStr) => {
  const date = new Date(dateStr);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const day = date.getUTCDate();
  const month = months[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  return `${day} ${month} ${year}`;
};

module.exports = { minutesToDisplay, parseTime, calcDuration, getWeekBounds, formatDateDisplay };
