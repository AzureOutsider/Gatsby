import fs from "node:fs";

const css = fs.readFileSync(
  new URL("../src/styles.css", import.meta.url),
  "utf8",
);
const tokens = Object.fromEntries(
  [...css.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})\s*;/gi)].map((match) => [
    match[1],
    match[2],
  ]),
);
function channel(value) {
  const normalized = value / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}
function luminance(color) {
  const rgb = [0, 2, 4].map((offset) =>
    Number.parseInt(color.slice(offset + 1, offset + 3), 16),
  );
  return (
    0.2126 * channel(rgb[0]) +
    0.7152 * channel(rgb[1]) +
    0.0722 * channel(rgb[2])
  );
}
function contrast(foreground, background) {
  const light = luminance(foreground),
    dark = luminance(background);
  return (Math.max(light, dark) + 0.05) / (Math.min(light, dark) + 0.05);
}
const foregrounds = ["ivory", "muted", "gold", "blue", "green"];
// Solid reference surfaces. Glass, image overlays, opacity and layout also
// require a rendered-page audit; this command is not a full WCAG audit.
const backgrounds = [
  "night",
  "wood",
  "#282125",
  "#211d23",
  "#33282c",
  "#57323b",
];
const failures = [];
for (const foreground of foregrounds)
  for (const background of backgrounds) {
    const ratio = contrast(
      tokens[foreground],
      background.startsWith("#") ? background : tokens[background],
    );
    console.log(`${foreground} on ${background}: ${ratio.toFixed(2)}:1`);
    if (ratio < 4.5)
      failures.push(`${foreground} on ${background} (${ratio.toFixed(2)}:1)`);
  }
if (failures.length)
  throw new Error(`WCAG AA 对比度不足：${failures.join(", ")}`);
console.log("WCAG AA 核心正文色彩检查通过（最低 4.5:1）。");
