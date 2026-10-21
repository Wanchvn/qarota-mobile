export function timeAgo(dateString) {
  if (!dateString) return '';
  
  // Replace space with T to make it ISO 8601 compliant for Safari/iOS
  const date = new Date(dateString.replace(' ', 'T'));
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'Just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  // If it's older than a week, just show the date (e.g., "Oct 15")
  const options = { month: 'short', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}