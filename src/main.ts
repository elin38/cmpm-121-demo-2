import "./style.css";

const APP_NAME = "Deno Drawer";
const app = document.querySelector<HTMLDivElement>("#app")!;
document.title = APP_NAME;

// Set up app title
const appTitle = document.createElement("h1");
appTitle.innerHTML = APP_NAME;
app.append(appTitle);

// Set up canvas
const canvas = document.createElement("canvas");
canvas.width = 256;
canvas.height = 256;
canvas.style.cursor = "none";
app.append(canvas);

// Button creation utility
function createButton(label: string, parent: HTMLElement, onClick: () => void): HTMLButtonElement {
  const button = document.createElement("button");
  button.innerHTML = label;
  button.addEventListener("click", onClick);
  parent.append(button);
  return button;
}

// Button holders for actions
const buttonHolder = document.createElement("div");
const thicknessButtonHolder = document.createElement("div");
const stickerButtonHolder = document.createElement("div");
const exportButtonHolder = document.createElement("div");
exportButtonHolder.style.marginTop = "20px";
app.append(buttonHolder, thicknessButtonHolder, stickerButtonHolder, exportButtonHolder);

// Drawing state
let lines: Line[] = [];
let redoLines: Line[] = [];
let stickers: Sticker[] = [];
let currentLine: Line | null = null;
let currentSticker: StickerPreview | null = null;
let lineThickness = 2;
let currentColor = "#FF5733";
let toolPreview: ToolPreview | null = null;
const cursor = { active: false, x: 0, y: 0 };

// Initialize stickers
const initialStickers = ["🎉", "😊", "🌟", "🌈", "💖", "🍀"];
initialStickers.forEach(createStickerButton);

// Set up buttons
// Button configurations -> refactored by using an array to help improve scalability and maintenence 
const buttonConfigs = [
  { label: "Clear", parent: buttonHolder, action: clearCanvas },
  { label: "Undo", parent: buttonHolder, action: undo },
  { label: "Redo", parent: buttonHolder, action: redo },
  { label: "Thin", parent: thicknessButtonHolder, action: () => setLineProperties(2) },
  { label: "Thick", parent: thicknessButtonHolder, action: () => setLineProperties(6) },
  { label: "Custom Sticker", parent: stickerButtonHolder, action: addCustomSticker },
  { label: "Export", parent: exportButtonHolder, action: exportDrawing },
];

// Dynamically create buttons
buttonConfigs.forEach(({ label, parent, action }) => createButton(label, parent, action));


// Canvas context and redraw function
const ctx = canvas.getContext("2d");
canvas.addEventListener("mousedown", handleMouseDown);
canvas.addEventListener("mousemove", handleMouseMove);
canvas.addEventListener("mouseup", handleMouseUp);
canvas.addEventListener("mouseout", dispatchDrawingChanged);
canvas.addEventListener("drawing-changed", redraw);

if (!ctx) {
  console.error("Unable to get canvas 2D context");
}

// Clear canvas action
function clearCanvas() {
  lines = [];
  redoLines = [];
  stickers = [];
  dispatchDrawingChanged();
}

// Undo action
function undo() {
  if (lines.length > 0) {
    redoLines.push(lines.pop()!);
    dispatchDrawingChanged();
  }
}

// Redo action
function redo() {
  if (redoLines.length > 0) {
    lines.push(redoLines.pop()!);
    dispatchDrawingChanged();
  }
}

// Set line properties and update tool preview
function setLineProperties(thickness: number) {
  lineThickness = thickness;
  currentColor = randomizeColor();

}

// Add custom sticker input
function addCustomSticker() {
  const customEmoji = prompt("Enter a custom sticker:", "🧽");
  if (customEmoji) {
    createStickerButton(customEmoji);
  }
}

// Create a sticker button
function createStickerButton(emoji: string) {
  createButton(emoji, stickerButtonHolder, () => {
    const rotation = randomizeRotation();
    currentSticker = new StickerPreview(cursor.x, cursor.y, emoji, randomizeColor(), rotation);
    dispatchToolMoved();
  });
}

// Randomize color
const randomizeColor = () => `#${Math.floor(Math.random() * 16777215).toString(16)}`;

// Randomize rotation
function randomizeRotation() {
  return Math.floor(Math.random() * 360);
}

// Dispatch drawing change event
function dispatchDrawingChanged() {
  canvas.dispatchEvent(new CustomEvent("drawing-changed"));
}

// Dispatch tool movement event
function dispatchToolMoved() {
  canvas.dispatchEvent(new CustomEvent("tool-moved", {
    detail: { x: cursor.x, y: cursor.y, thickness: lineThickness },
  }));
}

// Redraw canvas
function redraw() {
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  lines.forEach(line => line.display(ctx));
  stickers.forEach(sticker => sticker.display(ctx));
  toolPreview?.draw(ctx);
  currentSticker?.draw(ctx);
}

// Mouse event handlers
function handleMouseDown(e: MouseEvent) {
  cursor.active = true;
  cursor.x = e.offsetX;
  cursor.y = e.offsetY;

  if (currentSticker) {
    stickers.push(new Sticker(cursor.x, cursor.y, currentSticker.emoji, currentSticker.rotation));
    currentSticker = null;
  } else {
    currentLine = new Line(cursor.x, cursor.y, lineThickness, currentColor);
    lines.push(currentLine);
    redoLines = [];
  }
  dispatchDrawingChanged();
}

function handleMouseMove(e: MouseEvent) {
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
}

function handleMouseUp() {
  cursor.active = false;
  currentLine = null;
  toolPreview = null;
  dispatchDrawingChanged();
}

// Export drawing to PNG
function exportDrawing() {
  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = 1024;
  exportCanvas.height = 1024;
  const exportCtx = exportCanvas.getContext("2d");

  if (!exportCtx) {
    console.error("Unable to get 2D context for export canvas.");
    return;
  }

  exportCtx.scale(4, 4);
  lines.forEach(line => line.display(exportCtx));
  stickers.forEach(sticker => sticker.display(exportCtx));

  const anchor = document.createElement("a");
  anchor.href = exportCanvas.toDataURL();
  anchor.download = "drawing.png";
  anchor.click();
}

// Line class
class Line {
  private points: { x: number; y: number }[];
  
  constructor(private x: number, private y: number, private thickness: number, private color: string) {
    this.points = [{ x, y }];
  }

  display(ctx: CanvasRenderingContext2D) {
    ctx.lineWidth = this.thickness;
    ctx.strokeStyle = this.color;
    ctx.beginPath();
    ctx.moveTo(this.points[0].x, this.points[0].y);
    this.points.forEach(point => ctx.lineTo(point.x, point.y));
    ctx.stroke();
  }

  drag(x: number, y: number) {
    this.points.push({ x, y });
  }
}

// ToolPreview class
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

// Sticker class
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

// StickerPreview class
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
