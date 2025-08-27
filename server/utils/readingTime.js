export function readingTime(text) {
  const words = text ? text.trim().split(/\s+/).length : 0;
  return Math.ceil(words / 200);
}
