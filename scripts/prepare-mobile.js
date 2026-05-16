const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const out = path.join(root, 'dist-mobile');
const mobileAssets = path.join(root, 'assets-mobile');
const entries = ['index.html', 'manifest.webmanifest', 'assets', 'js'];

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

for (const entry of entries) {
  const from = path.join(root, entry);
  const to = path.join(out, entry);
  fs.cpSync(from, to, {
    recursive: true,
    filter: (src) => !src.endsWith('.bak'),
  });
}

if (fs.existsSync(mobileAssets)) {
  const assetsOut = path.join(out, 'assets');
  for (const item of fs.readdirSync(mobileAssets)) {
    if (item === 'README.md' || item === '.gitkeep') continue;
    fs.cpSync(path.join(mobileAssets, item), path.join(assetsOut, item), {
      recursive: true,
      filter: (src) => !src.endsWith('.bak') && !src.endsWith('README.md') && !src.endsWith('.gitkeep'),
    });
  }
}

const mobileLineClear = path.join(out, 'assets', 'sound', 'achi.mp3');
if (fs.existsSync(mobileLineClear)) {
  const configPath = path.join(out, 'js', 'config.js');
  const config = fs.readFileSync(configPath, 'utf8')
    .replaceAll('assets/sound/achi.flac', 'assets/sound/achi.mp3');
  fs.writeFileSync(configPath, config);
}

validateAssetReferences();
console.log(`Prepared mobile web assets in ${path.relative(root, out)}`);

function validateAssetReferences() {
  const files = [
    path.join(out, 'index.html'),
    path.join(out, 'manifest.webmanifest'),
    path.join(out, 'js', 'config.js'),
  ];
  const missing = [];

  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    for (const match of text.matchAll(/assets\/[A-Za-z0-9_./-]+/g)) {
      const ref = match[0].replace(/[)"',\]}]+$/, '');
      const target = path.join(out, ref);
      if (!fs.existsSync(target)) missing.push(`${path.relative(out, file)} -> ${ref}`);
    }
  }

  if (missing.length) {
    throw new Error(`Missing mobile asset references:\n${missing.join('\n')}`);
  }
}
