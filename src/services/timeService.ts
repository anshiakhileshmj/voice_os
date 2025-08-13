
export function getCurrentTime(): string {
  const now = new Date();
  return now.toLocaleTimeString();
}
