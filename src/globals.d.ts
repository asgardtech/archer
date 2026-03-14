declare const __APP_VERSION__: string;

interface ElectronSaveAPI {
  save(key: string, value: string): Promise<{ success: boolean; error?: string }>;
  load(key: string): Promise<string | null>;
  remove(key: string): Promise<{ success: boolean; error?: string }>;
  list(): Promise<string[]>;
}

interface Window {
  electronSave?: ElectronSaveAPI;
}
