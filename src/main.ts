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
app.append(clearHolder);

const ctx = canvas.getContext("2d");
const cursor = { active: false, x: 0, y: 0 };

if (ctx) {
    canvas.addEventListener("mousedown", (e) => {
        cursor.active = true;
        cursor.x = e.offsetX;
        cursor.y = e.offsetY;
    });

    canvas.addEventListener("mousemove", (e) => {
        if (cursor.active) {
            ctx.beginPath();
            ctx.moveTo(cursor.x, cursor.y);
            ctx.lineTo(e.offsetX, e.offsetY);
            ctx.stroke();
            cursor.x = e.offsetX;
            cursor.y = e.offsetY;
        }
    });

    canvas.addEventListener("mouseup", (e) => {
        cursor.active = false;
    });

    clearButton.addEventListener("click", () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    });
} else {
    console.error("Unable to get canvas 2D context");
}