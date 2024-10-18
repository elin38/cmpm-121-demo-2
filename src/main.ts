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
app.append(canvas);

const clearHolder = document.createElement("div");
const clearButton = document.createElement("button");
clearButton.innerHTML = "Clear";
clearHolder.append(clearButton);

const undoButton = document.createElement("button");
undoButton.innerHTML = "Undo";
clearHolder.append(undoButton);

const redoButton = document.createElement("button");
redoButton.innerHTML = "Redo";
clearHolder.append(redoButton);

app.append(clearHolder);

const ctx = canvas.getContext("2d");
const cursor = { active: false, x: 0, y: 0 };

let lines: Line[] = [];
let redoLines: Line[] = [];
let currentLine: Line | null = null;

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

    currentLine = new Line(cursor.x, cursor.y);
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
} else {
  console.error("Unable to get canvas 2D context");
}

// written with the help of chatGPT

class Line {
  private points: { x: number; y: number }[];

  constructor(x: number, y: number) {
    this.points = [{ x, y }];
  }

  display(ctx: CanvasRenderingContext2D) {
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
