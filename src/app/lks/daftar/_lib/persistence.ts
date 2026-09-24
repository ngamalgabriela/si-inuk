function readPersistedValue(key: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const currentValue = window.localStorage.getItem(key);
  if (currentValue !== null) {
    return currentValue;
  }

  const legacyValue = window.sessionStorage.getItem(key);
  if (legacyValue !== null) {
    window.localStorage.setItem(key, legacyValue);
    return legacyValue;
  }

  return null;
}

export function readSessionData<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  const raw = readPersistedValue(key);

  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeSessionData<T>(key: string, data: T): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(data));
}

export function getSessionSnapshot(key: string): string {
  if (typeof window === "undefined") {
    return "";
  }

  return readPersistedValue(key) ?? "";
}

export function subscribeSessionStorage(callback: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleStorage = (event: StorageEvent) => {
    if (!event.key || event.key.startsWith("si-inuk-lks-")) {
      callback();
    }
  };

  window.addEventListener("storage", handleStorage);
  return () => window.removeEventListener("storage", handleStorage);
}
