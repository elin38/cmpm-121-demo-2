import "./style.css";

const APP_NAME = "Deno Drawer";
const app = document.querySelector<HTMLDivElement>("#app")!;
document.title = APP_NAME;

const appTitle = document.createElement("h1");
appTitle.innerHTML = APP_NAME;
app.append(appTitle);

const canvas = document.createElement("canvas");
canvas.width = 256;
canvas.height = 256;
canvas.style.cursor = "none";
app.append(canvas);

function createButton(label: string, parent: HTMLElement, onClick: () => void): HTMLButtonElement {
  const button = document.createElement("button");
  button.innerHTML = label;
  button.addEventListener("click", onClick);
  parent.append(button);
  return button;
}

const buttonHolder = document.createElement("div");
createButton("Clear", buttonHolder, () => {
  lines = [];
  redoLines = [];
  stickers = [];
  dispatchDrawingChanged();
});
createButton("Undo", buttonHolder, () => {
  if (lines.length > 0) {
    redoLines.push(lines.pop()!);
    dispatchDrawingChanged();
  }
});
createButton("Redo", buttonHolder, () => {
  if (redoLines.length > 0) {
    lines.push(redoLines.pop()!);
    dispatchDrawingChanged();
  }
});
app.append(buttonHolder);

const thicknessButtonHolder = document.createElement("div");
let lineThickness = 2;
let currentColor = "#FF5733";

const randomizeColor = () => `#${Math.floor(Math.random() * 16777215).toString(16)}`; // Random hex color

const thinButton = createButton("Thin", thicknessButtonHolder, () => {
  lineThickness = 2;
  currentColor = randomizeColor();
  updateToolPreview();
});
const thickButton = createButton("Thick", thicknessButtonHolder, () => {
  lineThickness = 6;
  currentColor = randomizeColor();
  updateToolPreview();
});
thicknessButtonHolder.append(thinButton, thickButton);
app.append(thicknessButtonHolder);

function updateToolPreview() {
  toolPreview = new ToolPreview(cursor.x, cursor.y, lineThickness, currentColor, randomizeRotation());
  dispatchToolMoved();
}

const ctx = canvas.getContext("2d");
const cursor = { active: false, x: 0, y: 0 };

let lines: Line[] = [];
let redoLines: Line[] = [];
let currentLine: Line | null = null;
let toolPreview: ToolPreview | null = null;

const initialStickers = ["🎉", "😊", "🌟", "🌈", "💖", "🍀"];
let stickers: Sticker[] = [];
let currentSticker: StickerPreview | null = null;

const stickerButtonHolder = document.createElement("div");
initialStickers.forEach((emoji) => createStickerButton(emoji));
createButton("Custom Sticker", stickerButtonHolder, () => {
  const customEmoji = prompt("Enter a custom sticker:", "🧽");
  if (customEmoji) {
    createStickerButton(customEmoji);
  }
});
app.append(stickerButtonHolder);

function createStickerButton(emoji: string) {
  createButton(emoji, stickerButtonHolder, () => {
    const rotation = randomizeRotation();
    currentSticker = new StickerPreview(cursor.x, cursor.y, emoji, randomizeColor(), rotation);
    dispatchToolMoved();
  });
}

function randomizeRotation() {
  return Math.floor(Math.random() * 360);
}

function dispatchDrawingChanged() {
  const event = new CustomEvent("drawing-changed");
  canvas.dispatchEvent(event);
}

function dispatchToolMoved() {
  const event = new CustomEvent("tool-moved", {
    detail: { x: cursor.x, y: cursor.y, thickness: lineThickness },
  });
  canvas.dispatchEvent(event);
}

function redraw() {
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const line of lines) {
    line.display(ctx);
  }

  for (const sticker of stickers) {
    sticker.display(ctx);
  }

  if (!cursor.active && toolPreview) {
    toolPreview.draw(ctx);
  }

  if (currentSticker) {
    currentSticker.draw(ctx);
  }
}

canvas.addEventListener("drawing-changed", redraw);

if (ctx) {
  canvas.addEventListener("mousedown", (e) => {
    cursor.active = true;
    cursor.x = e.offsetX;
    cursor.y = e.offsetY;

    if (currentSticker) {
      stickers.push(new Sticker(cursor.x, cursor.y, currentSticker.emoji, currentSticker.rotation));
      currentSticker = null;
    } else {
      currentLine = new Line(cursor.x, cursor.y, lineThickness, currentColor);
      lines.push(currentLine);
      redoLines.splice(0, redoLines.length);
    }
    dispatchDrawingChanged();
  });

  canvas.addEventListener("mousemove", (e) => {
    cursor.x = e.offsetX;
    cursor.y = e.offsetY;

    toolPreview = new ToolPreview(cursor.x, cursor.y, lineThickness, currentColor, randomizeRotation());
    dispatchToolMoved();

    if (cursor.active && currentLine) {
      currentLine.drag(e.offsetX, e.offsetY);
      dispatchDrawingChanged();
    } else if (currentSticker) {
      currentSticker.drag(cursor.x, cursor.y);
      dispatchDrawingChanged();
    } else {
      redraw();
    }
  });

  canvas.addEventListener("mouseup", () => {
    cursor.active = false;
    currentLine = null;
    toolPreview = null;
    dispatchDrawingChanged();
  });

  canvas.addEventListener("mouseout", () => {
    dispatchDrawingChanged();
  });
} else {
  console.error("Unable to get canvas 2D context");
}

class Line {
  private points: { x: number; y: number }[];
  private thickness: number;
  private color: string;

  constructor(x: number, y: number, thickness: number, color: string) {
    this.points = [{ x, y }];
    this.thickness = thickness;
    this.color = color;
  }

  display(ctx: CanvasRenderingContext2D) {
    ctx.lineWidth = this.thickness;
    ctx.strokeStyle = this.color;
    ctx.beginPath();
    const { x, y } = this.points[0];
    ctx.moveTo(x, y);
    for (const point of this.points) {
      ctx.lineTo(point.x, point.y);
    }
    ctx.stroke();
  }

  drag(x: number, y: number) {
    this.points.push({ x, y });
  }
}

class ToolPreview {
  constructor(private x: number, private y: number, private thickness: number, private color: string, private rotation: number) {}

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.fillStyle = this.color;
    ctx.translate(this.x, this.y);
    ctx.rotate((Math.PI / 180) * this.rotation);
    ctx.beginPath();
    ctx.arc(0, 0, this.thickness, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class Sticker {
  constructor(private x: number, private y: number, public emoji: string, private rotation: number) {}

  display(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate((Math.PI / 180) * this.rotation);
    ctx.font = "32px Arial";
    ctx.fillStyle = "black";
    ctx.fillText(this.emoji, 0, 0);
    ctx.restore();
  }
}

class StickerPreview {
  constructor(private x: number, private y: number, public emoji: string, private color: string, public rotation: number) {}

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.fillStyle = this.color;
    ctx.translate(this.x, this.y);
    ctx.rotate((Math.PI / 180) * this.rotation);
    ctx.font = "32px Arial";
    ctx.fillText(this.emoji, 0, 0);
    ctx.restore();
  }

  drag(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}

const exportButtonHolder = document.createElement("div");
exportButtonHolder.style.marginTop = "20px";
app.append(exportButtonHolder);

createButton("Export", exportButtonHolder, () => {
  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = 1024;
  exportCanvas.height = 1024;
  const exportCtx = exportCanvas.getContext("2d");

  if (!exportCtx) {
    console.error("Unable to get 2D context for export canvas.");
    return;
  }

  exportCtx.scale(4, 4);

  for (const line of lines) {
    line.display(exportCtx);
  }

  for (const sticker of stickers) {
    sticker.display(exportCtx);
  }

  const anchor = document.createElement("a");
  anchor.href = exportCanvas.toDataURL();
  anchor.download = "drawing.png";
  anchor.click();
});
