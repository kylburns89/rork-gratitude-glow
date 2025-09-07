const sessionFlags: Record<string, boolean> = {};

export function oncePerSession(key: string, fn: () => void) {
  if (sessionFlags[key]) return;
  try {
    fn();
  } finally {
    sessionFlags[key] = true;
  }
}

export function hasFired(key: string): boolean {
  return !!sessionFlags[key];
}
