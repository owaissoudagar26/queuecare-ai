export function formatMinutes(mins) {
  if (mins === undefined || mins === null || isNaN(mins)) return '-- mins';
  if (mins < 1) return '< 1 min';
  if (mins < 60) return `${Math.round(mins)} mins`;
  const hrs = Math.floor(mins / 60);
  const rem = Math.round(mins % 60);
  return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
}

export function formatTime(dateString) {
  if (!dateString) return '--:--';
  try {
    const d = new Date(dateString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return dateString;
  }
}

export function formatDate(dateString) {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateString;
  }
}
