import { app, BrowserWindow, screen } from 'electron';
import path from 'path';
import fs from 'fs';

export interface WindowState {
  x?: number;
  y?: number;
  width: number;
  height: number;
  isMaximized: boolean;
  isFullScreen: boolean;
}

const STATE_FILE = 'window-state.json';

function getStateFilePath(): string {
  return path.join(app.getPath('userData'), STATE_FILE);
}

function isVisibleOnAnyDisplay(bounds: { x: number; y: number; width: number; height: number }): boolean {
  const displays = screen.getAllDisplays();
  return displays.some((display) => {
    const { x, y, width, height } = display.bounds;
    return (
      bounds.x < x + width &&
      bounds.x + bounds.width > x &&
      bounds.y < y + height &&
      bounds.y + bounds.height > y
    );
  });
}

export function loadWindowState(defaults: { width: number; height: number }): WindowState {
  const fallback: WindowState = {
    ...defaults,
    isMaximized: false,
    isFullScreen: false,
  };

  try {
    const raw = fs.readFileSync(getStateFilePath(), 'utf-8');
    const parsed = JSON.parse(raw);

    const width =
      typeof parsed.width === 'number' && parsed.width > 0
        ? Math.round(parsed.width)
        : defaults.width;
    const height =
      typeof parsed.height === 'number' && parsed.height > 0
        ? Math.round(parsed.height)
        : defaults.height;

    const state: WindowState = {
      width,
      height,
      isMaximized: parsed.isMaximized === true,
      isFullScreen: parsed.isFullScreen === true,
    };

    if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
      const bounds = { x: parsed.x, y: parsed.y, width, height };
      if (isVisibleOnAnyDisplay(bounds)) {
        state.x = parsed.x;
        state.y = parsed.y;
      }
    }

    return state;
  } catch {
    return fallback;
  }
}

export function saveWindowState(win: BrowserWindow): void {
  try {
    const bounds = win.getNormalBounds();
    const state: WindowState = {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      isMaximized: win.isMaximized(),
      isFullScreen: win.isFullScreen(),
    };
    fs.writeFileSync(getStateFilePath(), JSON.stringify(state, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to save window state:', e);
  }
}
