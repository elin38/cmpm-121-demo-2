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
  stickers = []; // Clear stickers
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
const thinButton = createButton("Thin", thicknessButtonHolder, () => {
  lineThickness = 1;
  thinButton.classList.add("selectedTool");
  thickButton.classList.remove("selectedTool");
});
const thickButton = createButton("Thick", thicknessButtonHolder, () => {
  lineThickness = 4;
  thickButton.classList.add("selectedTool");
  thinButton.classList.remove("selectedTool");
});
thicknessButtonHolder.append(thinButton, thickButton);
app.append(thicknessButtonHolder);

let stickers: Sticker[] = [];
let currentSticker: StickerPreview | null = null;

// Initial stickers data array
const initialStickers = ["🎉", "😊", "🌟"];

// Sticker button holder and custom sticker button
const stickerButtonHolder = document.createElement("div");

// Create sticker buttons from initial data
initialStickers.forEach((emoji) => createStickerButton(emoji));

// Button for custom sticker creation
createButton("Custom Sticker", stickerButtonHolder, () => {
  const customEmoji = prompt("Enter a custom sticker:", "🌈");
  if (customEmoji) {
    createStickerButton(customEmoji);
  }
});

app.append(stickerButtonHolder);

// Function to create sticker buttons based on the emoji passed
function createStickerButton(emoji: string) {
  createButton(emoji, stickerButtonHolder, () => {
    currentSticker = new StickerPreview(cursor.x, cursor.y, emoji);
    dispatchToolMoved();
  });
}

const ctx = canvas.getContext("2d");
const cursor = { active: false, x: 0, y: 0 };

let lines: Line[] = [];
let redoLines: Line[] = [];
let currentLine: Line | null = null;
let toolPreview: ToolPreview | null = null;

let lineThickness = 1;

thinButton.classList.add("selectedTool");

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

  // Draw stickers
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
      stickers.push(new Sticker(cursor.x, cursor.y, currentSticker.emoji));
      currentSticker = null;
    } else {
      currentLine = new Line(cursor.x, cursor.y, lineThickness);
      lines.push(currentLine);
      redoLines.splice(0, redoLines.length);
    }
    dispatchDrawingChanged();
  });

  canvas.addEventListener("mousemove", (e) => {
    cursor.x = e.offsetX;
    cursor.y = e.offsetY;

    toolPreview = new ToolPreview(cursor.x, cursor.y, lineThickness);
    dispatchToolMoved();

    if (cursor.active && currentLine) {
      currentLine.drag(e.offsetX, e.offsetY);
      dispatchDrawingChanged();
    } else {
      if (currentSticker) {
        currentSticker.drag(cursor.x, cursor.y);
      }
      dispatchDrawingChanged();
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

  constructor(x: number, y: number, thickness: number) {
    this.points = [{ x, y }];
    this.thickness = thickness;
  }

  display(ctx: CanvasRenderingContext2D) {
    ctx.lineWidth = this.thickness;
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
  constructor(private x: number, private y: number, private thickness: number) {}

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.thickness, 0, Math.PI * 2);
    ctx.fill();
  }
}

class Sticker {
  constructor(private x: number, private y: number, public emoji: string) {}

  display(ctx: CanvasRenderingContext2D) {
    ctx.font = "32px Arial";
    ctx.fillText(this.emoji, this.x, this.y);
  }
}

class StickerPreview {
  constructor(private x: number, private y: number, public emoji: string) {}

  draw(ctx: CanvasRenderingContext2D) {
    ctx.font = "32px Arial";
    ctx.fillText(this.emoji, this.x, this.y);
  }

  drag(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}
