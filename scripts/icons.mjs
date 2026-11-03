// Regenerates every icon in public/ from assets/icon.svg.
// Run with `npm run icons` after changing the SVG; the outputs are committed.
import { readFile, writeFile, copyFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("..", import.meta.url));
const src = `${root}assets/icon.svg`;
const out = (name) => `${root}public/${name}`;
const BG = "#f4ede1";
const SRC_SIZE = 180; // the SVG's viewBox width/height

const svg = await readFile(src);

/** Renders the SVG at `size` px, opaque on the paper background. */
function render(size) {
  return sharp(svg, { density: (72 * size) / SRC_SIZE })
    .resize(size, size)
    .flatten({ background: BG });
}

async function png(name, size) {
  await render(size).png().toFile(out(name));
  console.log(`  ${name}`);
}

/** Maskable: art scaled to 70% and centred, so it sits inside the 80% safe-zone circle. */
async function maskable(name, size) {
  const inner = Math.round(size * 0.7);
  const art = await render(inner).png().toBuffer();
  const composed = await sharp({ create: { width: size, height: size, channels: 3, background: BG } })
    .composite([{ input: art, gravity: "centre" }])
    .png()
    .toBuffer();
  // composite() runs last in a sharp pipeline, so drop the alpha channel in a second pass.
  await sharp(composed).flatten({ background: BG }).png().toFile(out(name));
  console.log(`  ${name}`);
}

/** Writes an .ico that embeds PNG images (supported by all current browsers). */
async function ico(name, sizes) {
  const images = await Promise.all(sizes.map((s) => render(s).ensureAlpha().png().toBuffer()));
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);
  const dir = Buffer.alloc(16 * images.length);
  let offset = header.length + dir.length;
  images.forEach((img, i) => {
    const s = sizes[i];
    const e = i * 16;
    dir.writeUInt8(s >= 256 ? 0 : s, e); // width
    dir.writeUInt8(s >= 256 ? 0 : s, e + 1); // height
    dir.writeUInt8(0, e + 2); // palette colours
    dir.writeUInt8(0, e + 3); // reserved
    dir.writeUInt16LE(1, e + 4); // colour planes
    dir.writeUInt16LE(32, e + 6); // bits per pixel
    dir.writeUInt32LE(img.length, e + 8);
    dir.writeUInt32LE(offset, e + 12);
    offset += img.length;
  });
  await writeFile(out(name), Buffer.concat([header, dir, ...images]));
  console.log(`  ${name}`);
}

console.log("Generating icons from assets/icon.svg:");
await copyFile(src, out("favicon.svg"));
console.log("  favicon.svg");
await ico("favicon.ico", [16, 32, 48]);
await png("apple-touch-icon-180x180.png", 180);
await png("pwa-192x192.png", 192);
await png("pwa-512x512.png", 512);
await maskable("maskable-icon-512x512.png", 512);
