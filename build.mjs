import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const sourceDir = dirname(fileURLToPath(import.meta.url));
const outputPath = join(sourceDir, "..", "calculator.html");

const [htmlSource, css, engine, app] = await Promise.all([
  readFile(join(sourceDir, "index.html"), "utf8"),
  readFile(join(sourceDir, "styles.css"), "utf8"),
  readFile(join(sourceDir, "engine.js"), "utf8"),
  readFile(join(sourceDir, "app.js"), "utf8")
]);

const marker =
  "<!-- Standalone build. Source lives in calculator/; rebuild with: node calculator/build.mjs -->";

let output = htmlSource
  .replace(
    '<link rel="stylesheet" href="styles.css">',
    `<style>\n${css}</style>`
  )
  .replace(
    '<script src="engine.js"></script>',
    `<script>\n${engine}</script>`
  )
  .replace(
    '<script src="app.js"></script>',
    `<script>\n${app}</script>`
  )
  .replace("<!doctype html>", `<!doctype html>\n${marker}`);

for (const local of ["styles.css", "engine.js", "app.js"]) {
  if (output.includes(`"${local}"`)) {
    throw new Error(`Failed to inline ${local}`);
  }
}

await writeFile(outputPath, output, "utf8");
console.log(`Wrote ${outputPath} (${output.length.toLocaleString()} bytes)`);
