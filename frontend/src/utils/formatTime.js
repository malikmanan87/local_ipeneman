/**
 * Formats a time string (e.g. "14:00", "08:30:00", or "14:00:00") into 12-hour AM/PM format (e.g. "2:00 PM", "8:30 AM").
 */
export function formatTimeAMPM(timeStr) {
  if (!timeStr) return '';
  if (timeStr.includes('AM') || timeStr.includes('PM')) return timeStr;

  const parts = timeStr.trim().split(':');
  if (parts.length < 2) return timeStr;

  let hours = parseInt(parts[0], 10);
  const minutes = parts[1].substring(0, 2);
  if (isNaN(hours)) return timeStr;

  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // '0' becomes '12'

  return `${hours}:${minutes} ${ampm}`;
}

/**
 * Formats start and end times into an AM/PM range string (e.g. "2:00 PM – 8:00 PM").
 */
export function formatShiftRange(startStr, endStr) {
  if (!startStr || !endStr) return '';
  return `${formatTimeAMPM(startStr)} – ${formatTimeAMPM(endStr)}`;
}
