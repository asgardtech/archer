export interface SpatialEntity {
  left: number;
  top: number;
  right: number;
  bottom: number;
  alive: boolean;
}

export class SpatialGrid<T extends SpatialEntity> {
  private cellWidth: number;
  private cellHeight: number;
  private cellsX: number;
  private cellsY: number;
  private cells: T[][];

  constructor(width: number, height: number, cellsX: number, cellsY: number) {
    this.cellsX = cellsX;
    this.cellsY = cellsY;
    this.cellWidth = width / cellsX;
    this.cellHeight = height / cellsY;
    this.cells = new Array(cellsX * cellsY);
    for (let i = 0; i < this.cells.length; i++) {
      this.cells[i] = [];
    }
  }

  clear(): void {
    for (let i = 0; i < this.cells.length; i++) {
      this.cells[i].length = 0;
    }
  }

  insert(entity: T): void {
    if (!entity.alive) return;
    const x0 = Math.max(0, Math.min(this.cellsX - 1, (entity.left / this.cellWidth) | 0));
    const x1 = Math.max(0, Math.min(this.cellsX - 1, (entity.right / this.cellWidth) | 0));
    const y0 = Math.max(0, Math.min(this.cellsY - 1, (entity.top / this.cellHeight) | 0));
    const y1 = Math.max(0, Math.min(this.cellsY - 1, (entity.bottom / this.cellHeight) | 0));

    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        this.cells[y * this.cellsX + x].push(entity);
      }
    }
  }

  query(left: number, top: number, right: number, bottom: number, out: T[]): void {
    out.length = 0;
    const x0 = Math.max(0, Math.min(this.cellsX - 1, (left / this.cellWidth) | 0));
    const x1 = Math.max(0, Math.min(this.cellsX - 1, (right / this.cellWidth) | 0));
    const y0 = Math.max(0, Math.min(this.cellsY - 1, (top / this.cellHeight) | 0));
    const y1 = Math.max(0, Math.min(this.cellsY - 1, (bottom / this.cellHeight) | 0));

    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const cell = this.cells[y * this.cellsX + x];
        for (let i = 0; i < cell.length; i++) {
          const entity = cell[i];
          if ((entity as any)._gridStamp !== this._queryStamp) {
            (entity as any)._gridStamp = this._queryStamp;
            out.push(entity);
          }
        }
      }
    }
  }

  private _queryStamp = 0;

  beginQuery(): void {
    this._queryStamp++;
  }
}
