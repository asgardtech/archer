import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronSave', {
  save: (key: string, value: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('save-game', key, value),
  load: (key: string): Promise<string | null> =>
    ipcRenderer.invoke('load-game', key),
  remove: (key: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('delete-game', key),
  list: (): Promise<string[]> =>
    ipcRenderer.invoke('list-games'),
});
