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

export interface StorageBackend {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

export class LocalStorageBackend implements StorageBackend {
  async get(key: string): Promise<string | null> {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  async set(key: string, value: string): Promise<void> {
    try {
      localStorage.setItem(key, value);
    } catch {
      // silently ignore
    }
  }

  async remove(key: string): Promise<void> {
    try {
      localStorage.removeItem(key);
    } catch {
      // silently ignore
    }
  }
}

export class ElectronStorageBackend implements StorageBackend {
  private api: ElectronSaveAPI;

  constructor(api: ElectronSaveAPI) {
    this.api = api;
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.api.load(key);
    } catch {
      return null;
    }
  }

  async set(key: string, value: string): Promise<void> {
    try {
      await this.api.save(key, value);
    } catch {
      // silently ignore — error already logged in main process
    }
  }

  async remove(key: string): Promise<void> {
    try {
      await this.api.remove(key);
    } catch {
      // silently ignore
    }
  }
}

let _backend: StorageBackend | null = null;

export function getStorageBackend(): StorageBackend {
  if (!_backend) {
    _backend =
      typeof window !== "undefined" && window.electronSave
        ? new ElectronStorageBackend(window.electronSave)
        : new LocalStorageBackend();
  }
  return _backend;
}

/** @internal For testing — override the singleton backend. */
export function setStorageBackend(backend: StorageBackend): void {
  _backend = backend;
}
