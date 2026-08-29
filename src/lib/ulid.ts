// Minimal ULID-like unique ID generator for event IDs
export function ulid(): string {
  return Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 9).toUpperCase();
}
