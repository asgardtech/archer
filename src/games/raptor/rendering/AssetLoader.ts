export type AssetManifest = Record<string, string>;
export type LoadedAssets = Map<string, HTMLImageElement>;

export class AssetLoader {
  private cache: Map<string, HTMLImageElement> = new Map();
  private _loadedCount = 0;
  private _totalCount = 0;

  get loadedCount(): number {
    return this._loadedCount;
  }

  get totalCount(): number {
    return this._totalCount;
  }

  get progress(): number {
    return this._totalCount === 0 ? 0 : this._loadedCount / this._totalCount;
  }

  async loadAll(manifest: AssetManifest): Promise<void> {
    const entries = Object.entries(manifest);
    this._totalCount = entries.length;
    this._loadedCount = 0;

    const promises = entries.map(([name, url]) => this.loadImage(name, url));
    await Promise.all(promises);
  }

  private loadImage(name: string, url: string): Promise<void> {
    return new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => {
        this.cache.set(name, img);
        this._loadedCount++;
        resolve();
      };
      img.onerror = () => {
        console.warn(`[AssetLoader] Failed to load asset "${name}" from "${url}"`);
        this._loadedCount++;
        resolve();
      };
      img.src = url;
    });
  }

  get(name: string): HTMLImageElement {
    const img = this.cache.get(name);
    if (!img) throw new Error(`Asset "${name}" not loaded`);
    return img;
  }

  getOptional(name: string): HTMLImageElement | null {
    return this.cache.get(name) ?? null;
  }

  addGenerated(name: string, canvas: HTMLCanvasElement): void {
    const img = new Image();
    img.src = canvas.toDataURL();
    this.cache.set(name, img);
  }
}
