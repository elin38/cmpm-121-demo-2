import "./style.css";

const APP_NAME = "Deno Drawer";
const app = document.querySelector<HTMLDivElement>("#app")!;

document.title = APP_NAME;

const appTitle = document.createElement("h1");
appTitle.innerHTML = APP_NAME;
app.append(appTitle);

// Create canvas
const canvas = document.createElement("canvas");
canvas.width = 256;
canvas.height = 256;
app.append(canvas);

// Create buttons for clear, undo, redo
const buttonHolder = document.createElement("div");
const clearButton = document.createElement("button");
clearButton.innerHTML = "Clear";
buttonHolder.append(clearButton);

const undoButton = document.createElement("button");
undoButton.innerHTML = "Undo";
buttonHolder.append(undoButton);

const redoButton = document.createElement("button");
redoButton.innerHTML = "Redo";
buttonHolder.append(redoButton);

app.append(buttonHolder);

const thicknessButtonHolder = document.createElement("div");
const thinButton = document.createElement("button");
thinButton.innerHTML = "Thin";
thicknessButtonHolder.append(thinButton);

const thickButton = document.createElement("button");
thickButton.innerHTML = "Thick";
thicknessButtonHolder.append(thickButton);

app.append(thicknessButtonHolder);

const ctx = canvas.getContext("2d");
const cursor = { active: false, x: 0, y: 0 };

let lines: Line[] = [];
let redoLines: Line[] = [];
let currentLine: Line | null = null;

let lineThickness = 1;

thinButton.classList.add("selectedTool");

function dispatchDrawingChanged() {
  const event = new CustomEvent("drawing-changed");
  canvas.dispatchEvent(event);
}

function redraw() {
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const line of lines) {
    line.display(ctx);
  }
}

canvas.addEventListener("drawing-changed", redraw);

if (ctx) {
  canvas.addEventListener("mousedown", (e) => {
    cursor.active = true;
    cursor.x = e.offsetX;
    cursor.y = e.offsetY;

    currentLine = new Line(cursor.x, cursor.y, lineThickness);
    lines.push(currentLine);
    redoLines.splice(0, redoLines.length);

    dispatchDrawingChanged();
  });

  canvas.addEventListener("mousemove", (e) => {
    if (cursor.active && currentLine) {
      currentLine.drag(e.offsetX, e.offsetY);
      dispatchDrawingChanged();
    }
  });

  canvas.addEventListener("mouseup", () => {
    cursor.active = false;
    currentLine = null;
    dispatchDrawingChanged();
  });

  clearButton.addEventListener("click", () => {
    lines = [];
    redoLines = [];
    dispatchDrawingChanged();
  });

  undoButton.addEventListener("click", () => {
    if (lines.length > 0) {
      redoLines.push(lines.pop()!);
      dispatchDrawingChanged();
    }
  });

  redoButton.addEventListener("click", () => {
    if (redoLines.length > 0) {
      lines.push(redoLines.pop()!);
      dispatchDrawingChanged();
    }
  });

  thinButton.addEventListener("click", () => {
    lineThickness = 1;
    thinButton.classList.add("selectedTool");
    thickButton.classList.remove("selectedTool");
  });

  thickButton.addEventListener("click", () => {
    lineThickness = 4;
    thickButton.classList.add("selectedTool");
    thinButton.classList.remove("selectedTool"); 
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
