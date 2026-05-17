const { readdirSync } = require('fs');
const { join } = require('path');
const { spawnSync } = require('child_process');

const jsDir = join(process.cwd(), 'js');
const files = readdirSync(jsDir)
  .filter(name => name.endsWith('.js'))
  .sort()
  .map(name => join(jsDir, name));

let failed = false;

for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], {
    stdio: 'inherit'
  });
  if (result.status !== 0) failed = true;
}

if (failed) process.exit(1);
console.log(`OK: checked ${files.length} JavaScript files`);
