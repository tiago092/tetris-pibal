const { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } = require('fs');
const { join } = require('path');
const loadEnvFile = require('./load-env-file');

const root = process.cwd();
const outDir = join(root, 'dist');
const entries = ['index.html', 'manifest.webmanifest', 'assets', 'js'];

loadEnvFile();

if (existsSync(outDir)) rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

for (const entry of entries) {
  cpSync(join(root, entry), join(outDir, entry), { recursive: true });
}

if (process.env.SUPABASE_URL || process.env.SUPABASE_ANON_KEY) {
  const url = (process.env.SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
  const anonKey = process.env.SUPABASE_ANON_KEY || '';

  if (!url || !anonKey) {
    console.error('SUPABASE_URL and SUPABASE_ANON_KEY must both be set for online ranking.');
    process.exit(1);
  }
  if (!/^https:\/\/[^/]+\.supabase\.co$/.test(url) && !/^http:\/\/127\.0\.0\.1:\d+$/.test(url)) {
    console.error('SUPABASE_URL must look like https://<project-ref>.supabase.co or http://127.0.0.1:<port>');
    process.exit(1);
  }

  const content = `window.TETRIS_PIBAL_SUPABASE = Object.freeze({
  url: ${JSON.stringify(url)},
  anonKey: ${JSON.stringify(anonKey)}
});
`;
  writeFileSync(join(outDir, 'js', 'supabase-config.js'), content);
  console.log('Wrote dist/js/supabase-config.js');
} else {
  console.warn('Warning: SUPABASE_URL/SUPABASE_ANON_KEY not set; deploying with local-only ranking config.');
}

console.log(`Prepared static deploy in ${outDir}`);
