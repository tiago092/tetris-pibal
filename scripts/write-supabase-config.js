const { writeFileSync } = require('fs');
const { join } = require('path');
const loadEnvFile = require('./load-env-file');

loadEnvFile();

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
  return value;
}

const url = requireEnv('SUPABASE_URL').replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
const anonKey = requireEnv('SUPABASE_ANON_KEY');

if (!/^https:\/\/[^/]+\.supabase\.co$/.test(url) && !/^http:\/\/127\.0\.0\.1:\d+$/.test(url)) {
  console.error('SUPABASE_URL must look like https://<project-ref>.supabase.co or http://127.0.0.1:<port>');
  process.exit(1);
}

const content = `window.TETRIS_PIBAL_SUPABASE = Object.freeze({
  url: ${JSON.stringify(url)},
  anonKey: ${JSON.stringify(anonKey)}
});
`;

writeFileSync(join(process.cwd(), 'js', 'supabase-config.js'), content);
console.log('Wrote js/supabase-config.js');
