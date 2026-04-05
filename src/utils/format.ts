export function formatPublishedLabel(dateValue: string) {
  const publishedAt = new Date(dateValue);
  const diffMinutes = Math.max(1, Math.floor((Date.now() - publishedAt.getTime()) / 60000));

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  return publishedAt.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export function formatReadingTime(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 180));
  return `${minutes} min read`;
}
