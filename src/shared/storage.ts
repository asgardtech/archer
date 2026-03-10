export function tryGetStorage(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

export function trySetStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // localStorage unavailable — silently ignore
  }
}

export function tryRemoveStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // localStorage unavailable — silently ignore
  }
}
