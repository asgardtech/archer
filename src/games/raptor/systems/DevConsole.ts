export class DevConsole {
  public isOpen = false;
  public onSubmit: ((command: string) => void) | null = null;

  private inputBuffer = "";
  private outputLog: string[] = [];
  private history: string[] = [];
  private historyIndex = -1;
  private savedInput = "";
  private cursorBlinkTimer = 0;
  private cursorVisible = true;

  private boundKeyDown: (e: KeyboardEvent) => void;

  constructor() {
    this.boundKeyDown = (e: KeyboardEvent) => this.handleKeyDown(e);
    window.addEventListener("keydown", this.boundKeyDown);
  }

  toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  open(): void {
    this.isOpen = true;
    this.cursorVisible = true;
    this.cursorBlinkTimer = 0;
  }

  close(): void {
    this.isOpen = false;
  }

  log(message: string): void {
    this.outputLog.push(message);
    if (this.outputLog.length > 100) {
      this.outputLog.shift();
    }
  }

  update(dt: number): void {
    if (!this.isOpen) return;
    this.cursorBlinkTimer += dt;
    if (this.cursorBlinkTimer >= 0.53) {
      this.cursorBlinkTimer -= 0.53;
      this.cursorVisible = !this.cursorVisible;
    }
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (!this.isOpen) return;

    const panelTop = height * 0.6;
    const panelHeight = height - panelTop;
    const titleBarHeight = 24;
    const inputLineHeight = 28;
    const padding = 8;
    const fontSize = 12;
    const lineHeight = 14;

    // Panel background
    ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
    ctx.fillRect(0, panelTop, width, panelHeight);

    // Title bar
    ctx.fillStyle = "rgba(30, 30, 30, 0.95)";
    ctx.fillRect(0, panelTop, width, titleBarHeight);

    // Top border (drawn after title bar so it's not obscured)
    ctx.strokeStyle = "rgba(0, 255, 65, 0.4)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, panelTop + 0.5);
    ctx.lineTo(width, panelTop + 0.5);
    ctx.stroke();
    ctx.font = `${fontSize}px monospace`;
    ctx.fillStyle = "#ffffff";
    ctx.textBaseline = "middle";
    ctx.fillText("Developer Console", padding, panelTop + titleBarHeight / 2);

    // Input line background
    const inputTop = height - inputLineHeight;
    ctx.fillStyle = "rgba(20, 20, 20, 0.95)";
    ctx.fillRect(0, inputTop, width, inputLineHeight);

    // Input line text
    ctx.font = `${fontSize}px monospace`;
    const prompt = "> ";
    const promptWidth = ctx.measureText(prompt).width;
    const inputText = this.inputBuffer;
    const cursorChar = this.cursorVisible ? "_" : "";
    const fullInputText = inputText + cursorChar;
    const fullWidth = ctx.measureText(prompt + fullInputText).width;
    const availableWidth = width - padding * 2;

    let textOffsetX = 0;
    if (fullWidth > availableWidth) {
      textOffsetX = fullWidth - availableWidth;
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(padding, inputTop, availableWidth, inputLineHeight);
    ctx.clip();

    const drawX = padding - textOffsetX;
    const drawY = inputTop + inputLineHeight / 2;
    ctx.fillStyle = "rgba(0, 255, 65, 0.9)";
    ctx.fillText(prompt, drawX, drawY);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(inputText + cursorChar, drawX + promptWidth, drawY);
    ctx.restore();

    // Output area (clipped)
    const outputTop = panelTop + titleBarHeight;
    const outputBottom = inputTop;
    const outputHeight = outputBottom - outputTop;

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, outputTop, width, outputHeight);
    ctx.clip();

    ctx.font = `${fontSize}px monospace`;
    ctx.fillStyle = "rgba(0, 255, 65, 0.9)";
    ctx.textBaseline = "bottom";

    const maxVisibleLines = Math.floor(outputHeight / lineHeight);
    const startIndex = Math.max(0, this.outputLog.length - maxVisibleLines);
    let y = outputBottom - padding;

    for (let i = this.outputLog.length - 1; i >= startIndex; i--) {
      if (y - lineHeight < outputTop) break;
      ctx.fillText(this.outputLog[i], padding, y);
      y -= lineHeight;
    }

    ctx.restore();
  }

  destroy(): void {
    window.removeEventListener("keydown", this.boundKeyDown);
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.isOpen) return;
    if (e.key === "`") return;

    e.preventDefault();
    e.stopPropagation();

    switch (e.key) {
      case "Enter":
        this.submit();
        break;
      case "Backspace":
        this.inputBuffer = this.inputBuffer.slice(0, -1);
        break;
      case "ArrowUp":
        this.historyUp();
        break;
      case "ArrowDown":
        this.historyDown();
        break;
      default:
        if (e.key.length === 1) {
          this.inputBuffer += e.key;
          this.resetCursorBlink();
        }
        break;
    }
  }

  private submit(): void {
    const trimmed = this.inputBuffer.trim();
    if (!trimmed) return;

    this.history.push(trimmed);
    if (this.history.length > 50) {
      this.history.shift();
    }
    this.historyIndex = -1;
    this.savedInput = "";

    if (this.onSubmit) {
      this.onSubmit(trimmed);
    }

    this.inputBuffer = "";
  }

  private historyUp(): void {
    if (this.history.length === 0) return;

    if (this.historyIndex === -1) {
      this.savedInput = this.inputBuffer;
      this.historyIndex = this.history.length - 1;
    } else if (this.historyIndex > 0) {
      this.historyIndex--;
    }

    this.inputBuffer = this.history[this.historyIndex];
    this.resetCursorBlink();
  }

  private historyDown(): void {
    if (this.historyIndex === -1) return;

    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.inputBuffer = this.history[this.historyIndex];
    } else {
      this.historyIndex = -1;
      this.inputBuffer = this.savedInput;
    }

    this.resetCursorBlink();
  }

  private resetCursorBlink(): void {
    this.cursorVisible = true;
    this.cursorBlinkTimer = 0;
  }
}
