const { cpSync, existsSync, mkdirSync, rmSync } = require('fs');
const { join } = require('path');

const root = process.cwd();
const outDir = join(root, 'dist');
const entries = ['index.html', 'manifest.webmanifest', 'assets', 'js'];

if (existsSync(outDir)) rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

for (const entry of entries) {
  cpSync(join(root, entry), join(outDir, entry), { recursive: true });
}

console.log(`Prepared static deploy in ${outDir}`);
