/** Start of the calendar day for a given date (local server time). */
function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** End of the calendar day for a given date (local server time). */
function endOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Builds a mongo range filter from optional `from` / `to` query values.
 * Returns undefined when neither bound was supplied.
 */
function buildDateRange(from, to) {
  const range = {};
  if (from) range.$gte = startOfDay(from);
  if (to) range.$lte = endOfDay(to);
  return Object.keys(range).length ? range : undefined;
}

/** Whole minutes from a seconds counter, used across usage and attendance. */
function toMinutes(seconds = 0) {
  return Math.round((seconds / 60) * 10) / 10;
}

module.exports = { startOfDay, endOfDay, buildDateRange, toMinutes };
