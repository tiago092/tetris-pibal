const { spawnSync } = require('child_process');
const loadEnvFile = require('./load-env-file');

loadEnvFile();

const projectRef = process.env.SUPABASE_PROJECT_REF;
if (!projectRef) {
  console.error('Missing required env var: SUPABASE_PROJECT_REF');
  process.exit(1);
}

const command = process.platform === 'win32' ? 'supabase.cmd' : 'supabase';
const args = ['link', '--project-ref', projectRef, '--yes'];
if (process.env.SUPABASE_DB_PASSWORD) {
  args.push('--password', process.env.SUPABASE_DB_PASSWORD);
}

const result = spawnSync(command, args, {
  stdio: 'inherit'
});

process.exit(result.status ?? 1);
