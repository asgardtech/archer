export function formatRelativeDate(isoStringOrTimestamp: string | number): string {
  try {
    const saved = typeof isoStringOrTimestamp === "number"
      ? new Date(isoStringOrTimestamp)
      : new Date(isoStringOrTimestamp);
    if (isNaN(saved.getTime())) {
      return typeof isoStringOrTimestamp === "string" ? isoStringOrTimestamp : "Unknown date";
    }
    const now = Date.now();
    const diffMs = now - saved.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h ago`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 30) return `${diffD}d ago`;
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[saved.getMonth()]} ${saved.getDate()}, ${saved.getFullYear()}`;
  } catch {
    return "Unknown date";
  }
}
