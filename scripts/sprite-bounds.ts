import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { writeJson } from "./common";
const { PNG } = createRequire(import.meta.url)("pngjs") as {
  PNG: {
    sync: {
      read(buffer: Buffer): { width: number; height: number; data: Buffer };
    };
  };
};
const file = process.argv[2] ?? "public/pixel/miko-atlas.png";
const image = PNG.sync.read(readFileSync(file));
const gridSize = (name: string, fallback: number) => {
  const value = Number(
    process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ??
      fallback,
  );
  if (!Number.isInteger(value) || value < 1 || value > 16)
    throw new Error(`${name} must be an integer from 1 to 16`);
  return value;
};
const columns = gridSize("columns", 4),
  rows = gridSize("rows", 2);
const cw = Math.floor(image.width / columns),
  ch = Math.floor(image.height / rows);
let left = cw,
  top = ch,
  right = 0,
  bottom = 0;
const cells = [];
for (let row = 0; row < rows; row++)
  for (let col = 0; col < columns; col++) {
    const visited = new Uint8Array(cw * ch);
    let largest = 0,
      bounds = { left: cw, top: ch, right: 0, bottom: 0 };
    const originX = Math.floor((col * image.width) / columns),
      originY = Math.floor((row * image.height) / rows);
    const opaque = (x: number, y: number) =>
      image.data[((originY + y) * image.width + originX + x) * 4 + 3] > 180;
    for (let y = 0; y < ch; y++)
      for (let x = 0; x < cw; x++) {
        const start = y * cw + x;
        if (visited[start] || !opaque(x, y)) continue;
        const queue = [start];
        visited[start] = 1;
        let head = 0;
        const b = { left: x, top: y, right: x, bottom: y };
        while (head < queue.length) {
          const item = queue[head++],
            px = item % cw,
            py = Math.floor(item / cw);
          b.left = Math.min(b.left, px);
          b.right = Math.max(b.right, px);
          b.top = Math.min(b.top, py);
          b.bottom = Math.max(b.bottom, py);
          for (let dy = -1; dy <= 1; dy++)
            for (let dx = -1; dx <= 1; dx++) {
              const nx = px + dx,
                ny = py + dy;
              if (nx < 0 || ny < 0 || nx >= cw || ny >= ch) continue;
              const n = ny * cw + nx;
              if (!visited[n] && opaque(nx, ny)) {
                visited[n] = 1;
                queue.push(n);
              }
            }
        }
        if (queue.length > largest) {
          largest = queue.length;
          bounds = b;
        }
      }
    if (largest < cw * ch * 0.025)
      throw new Error("A sprite cell has no usable opaque character");
    cells.push({ ...bounds, originX, originY, pixels: largest });
    left = Math.min(left, bounds.left);
    right = Math.max(right, bounds.right);
    top = Math.min(top, bounds.top);
    bottom = Math.max(bottom, bounds.bottom);
  }
left = Math.max(0, left - 2);
top = Math.max(0, top - 2);
right = Math.min(cw - 1, right + 2);
bottom = Math.min(ch - 1, bottom + 2);
const metadata = {
  width: image.width,
  height: image.height,
  columns,
  rows,
  cellWidth: cw,
  cellHeight: ch,
  crop: { x: left, y: top, width: right - left + 1, height: bottom - top + 1 },
  poses:
    columns === 4 && rows === 2
      ? {
          idle: 0,
          walk: [1, 2, 3, 2],
          point: 4,
          think: 5,
          surprised: 6,
          reach: 7,
        }
      : {},
  cells,
};
writeJson(process.argv[3] ?? "public/pixel/miko-atlas.json", metadata);
console.log(metadata);
