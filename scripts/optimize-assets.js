const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const sourceRoot = path.join(root, 'assets');
const mobileRoot = path.join(root, 'assets-mobile');
const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';

function rel(file) {
  return path.relative(root, file).replaceAll(path.sep, '/');
}

function size(file) {
  return fs.existsSync(file) ? fs.statSync(file).size : 0;
}

function ensureDir(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
}

function run(args) {
  const result = spawnSync(ffmpeg, args, { stdio: 'inherit' });
  if (result.error) {
    throw new Error(`Could not run ffmpeg. Install ffmpeg or set FFMPEG_PATH. ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`ffmpeg failed with exit code ${result.status}`);
  }
}

function transcodeVideo(inputRel, outputRel, height, crf, audioBitrate = '96k', dropAudio = false) {
  const input = path.join(sourceRoot, inputRel);
  const output = path.join(mobileRoot, outputRel);
  if (!fs.existsSync(input)) throw new Error(`Missing source: ${rel(input)}`);
  ensureDir(output);

  const args = [
    '-y',
    '-i', input,
    '-vf', `scale=-2:${height}`,
    '-c:v', 'libx264',
    '-preset', 'medium',
    '-crf', String(crf),
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
  ];

  if (dropAudio) args.push('-an');
  else args.push('-c:a', 'aac', '-b:a', audioBitrate, '-ac', '2', '-ar', '44100');

  args.push(output);
  run(args);
  return { input, output };
}

function transcodeAudio(inputRel, outputRel, bitrate = '128k') {
  const input = path.join(sourceRoot, inputRel);
  const output = path.join(mobileRoot, outputRel);
  if (!fs.existsSync(input)) throw new Error(`Missing source: ${rel(input)}`);
  ensureDir(output);

  run([
    '-y',
    '-i', input,
    '-vn',
    '-c:a', 'libmp3lame',
    '-b:a', bitrate,
    '-ac', '2',
    '-ar', '44100',
    output,
  ]);
  return { input, output };
}

function optimizeImage(inputRel, outputRel, height = 720) {
  const input = path.join(sourceRoot, inputRel);
  const output = path.join(mobileRoot, outputRel);
  if (!fs.existsSync(input)) throw new Error(`Missing source: ${rel(input)}`);
  ensureDir(output);

  run([
    '-y',
    '-i', input,
    '-vf', `scale=-2:${height}`,
    '-compression_level', '9',
    output,
  ]);
  return { input, output };
}

const jobs = [
  // Full-screen videos
  () => transcodeVideo('video/ganaste.mp4', 'video/ganaste.mp4', 720, 26, '96k'),
  () => transcodeVideo('video/quepuedoeu.mp4', 'video/quepuedoeu.mp4', 720, 27, '96k'),

  // Board/background videos
  () => transcodeVideo('video/babydonthurtme.mp4', 'video/babydonthurtme.mp4', 540, 29, '96k', true),
  () => transcodeVideo('video/guillenada.mp4', 'video/guillenada.mp4', 540, 29, '96k', true),
  () => transcodeVideo('video/festincumbia.mp4', 'video/festincumbia.mp4', 540, 29, '96k'),
  () => transcodeVideo('video/sacamelacaraguille.mp4', 'video/sacamelacaraguille.mp4', 540, 28, '96k'),

  // Long music
  () => transcodeAudio('sound/castro.mp3', 'sound/castro.mp3', '128k'),
  () => transcodeAudio('sound/intro.mp3', 'sound/intro.mp3', '128k'),
  () => transcodeAudio('sound/mike.mp3', 'sound/mike.mp3', '128k'),
  () => transcodeAudio('sound/rapdelavilla.mp3', 'sound/rapdelavilla.mp3', '128k'),
  () => transcodeAudio('sound/ganaste.mp3', 'sound/ganaste.mp3', '128k'),
  () => transcodeAudio('sound/elsemidios-rmx.mp3', 'sound/elsemidios-rmx.mp3', '128k'),
  () => transcodeAudio('sound/voysoloska.mp3', 'sound/voysoloska.mp3', '128k'),
  () => transcodeAudio('sound/cacho.mp3', 'sound/cacho.mp3', '128k'),
  () => transcodeAudio('sound/defeatsong.mp3', 'sound/defeatsong.mp3', '128k'),

  // Short effects
  () => transcodeAudio('sound/achi.flac', 'sound/achi.mp3', '96k'),
  () => transcodeAudio('sound/vein.mp3', 'sound/vein.mp3', '96k'),
  () => transcodeAudio('sound/humiliation.mp3', 'sound/humiliation.mp3', '96k'),
  () => transcodeAudio('sound/monsterkill.mp3', 'sound/monsterkill.mp3', '96k'),
  () => transcodeAudio('sound/monkconv.mp3', 'sound/monkconv.mp3', '96k'),

  // Large menu image
  () => optimizeImage('img/achitiago.png', 'img/achitiago.png', 720),
];

function formatBytes(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function main() {
  fs.mkdirSync(mobileRoot, { recursive: true });
  const results = [];

  for (const job of jobs) {
    const result = job();
    results.push(result);
    const before = size(result.input);
    const after = size(result.output);
    const saved = before ? Math.round((1 - after / before) * 100) : 0;
    console.log(`${rel(result.output)}: ${formatBytes(before)} -> ${formatBytes(after)} (${saved}% smaller)`);
  }

  const originalTotal = results.reduce((sum, item) => sum + size(item.input), 0);
  const mobileTotal = results.reduce((sum, item) => sum + size(item.output), 0);
  console.log(`Optimized selected media: ${formatBytes(originalTotal)} -> ${formatBytes(mobileTotal)}`);
}

main();
