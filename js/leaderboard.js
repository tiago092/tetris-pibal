// ---- Leaderboard / Supabase ----
// La anon key es publica en clientes web. La validacion de abajo mejora el
// cliente, pero la proteccion real contra abuso debe vivir en RLS/rate limits.
const SUPA_CONFIG = window.TETRIS_PIBAL_SUPABASE || {};
const SUPA_BASE_URL = String(SUPA_CONFIG.url || '').replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
const SUPA_URL = SUPA_BASE_URL ? `${SUPA_BASE_URL}/rest/v1` : '';
const SUPA_KEY = String(SUPA_CONFIG.anonKey || '');

let cachedScores = null;
let scoresLastFetch = 0;
let scoresFetchPromise = null;
let playerLocationPromise = null;
const SCORES_REFRESH_MS = 60000;
const SCORE_SUBMIT_COOLDOWN_MS = 30000;
const SCORES_STORAGE_KEY = 'tetrispibal_scores';
const SCORE_SUBMIT_STORAGE_KEY = 'tetrispibal_last_remote_score_submit';

function getDeviceType() {
  return matchMedia('(pointer: coarse)').matches ? 'touch' : 'desktop';
}

function sanitizeText(value, maxLength) {
  return String(value ?? '')
    .replace(/[\x00-\x1f\x7f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function normalizeDifficulty(diff) {
  const value = sanitizeText(diff, 40);
  if (!value) return '';
  const match = DIFFICULTIES.find(d => d.name === value || d.short === value);
  return match ? value : '';
}

function normalizeScoreEntry(raw, { allowMissingDate=false }={}) {
  if (!raw || typeof raw !== 'object') return null;

  const name = sanitizeText(raw.name, 16);
  const score = Number(raw.score);
  const level = Number(raw.level);
  const diff = normalizeDifficulty(raw.diff);
  if (!name || !Number.isInteger(score) || score < 0) return null;
  if (!diff || !Number.isInteger(level) || level < 1 || level > LEVELS.length) return null;

  const entry = {
    name,
    score,
    diff,
    level,
    won: raw.won === true,
    country: sanitizeText(raw.country, 40),
    city: sanitizeText(raw.city, 60),
    date: sanitizeText(raw.date, 20)
  };

  if (raw._new === true) entry._new = true;
  if (!entry.date && !allowMissingDate) entry.date = new Date().toLocaleDateString();
  return entry;
}

function normalizeRemoteScore(row) {
  if (!row || typeof row !== 'object') return null;
  const createdAt = row.created_at ? new Date(row.created_at) : null;
  return normalizeScoreEntry({
    name: row.name,
    score: row.score,
    diff: row.diff,
    level: row.level,
    won: row.won,
    country: row.country,
    city: row.city,
    date: createdAt && !Number.isNaN(createdAt.getTime()) ? createdAt.toLocaleDateString() : ''
  }, { allowMissingDate: true });
}

function sortScores(scores) {
  return scores
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

function canSubmitRemoteScore() {
  const last = Number(localStorage.getItem(SCORE_SUBMIT_STORAGE_KEY) || 0);
  return !last || Date.now() - last >= SCORE_SUBMIT_COOLDOWN_MS;
}

function markRemoteScoreSubmit() {
  localStorage.setItem(SCORE_SUBMIT_STORAGE_KEY, String(Date.now()));
}

async function fetchPlayerLocationByIp() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);
  try {
    const res = await fetch('https://ipapi.co/json/', { signal: controller.signal });
    if (!res.ok) throw new Error('ip location failed');
    const data = await res.json();
    return {
      country: data.country_name || data.country || '',
      city: data.city || data.region || ''
    };
  } catch {
    return { country: '', city: '' };
  } finally {
    clearTimeout(timeout);
  }
}

function getPlayerLocationInfo() {
  if (playerLocationPromise) return playerLocationPromise;
  playerLocationPromise = fetchPlayerLocationByIp();
  return playerLocationPromise;
}

async function fetchScoresFromSupabase() {
  if (!SUPA_URL || !SUPA_KEY) return null;
  if (scoresFetchPromise) return scoresFetchPromise;
  const now = Date.now();
  if (cachedScores && now - scoresLastFetch < SCORES_REFRESH_MS) return cachedScores;

  scoresFetchPromise = fetch(`${SUPA_URL}/scores?order=score.desc&limit=10`, {
    headers: { 'apikey': SUPA_KEY, 'Authorization': `Bearer ${SUPA_KEY}` }
  })
    .then(res => {
      if (!res.ok) throw new Error('fetch failed');
      return res.json();
    })
    .then(data => {
      const scores = sortScores(Array.isArray(data) ? data.map(normalizeRemoteScore) : []);
      cachedScores = scores;
      scoresLastFetch = Date.now();
      localStorage.setItem(SCORES_STORAGE_KEY, JSON.stringify(scores));
      return scores;
    })
    .catch(() => null)
    .finally(() => { scoresFetchPromise = null; });

  return scoresFetchPromise;
}

function refreshScoresFromSupabase() {
  scoresLastFetch = 0;
  return fetchScoresFromSupabase();
}

function loadScores() {
  try {
    const raw = JSON.parse(localStorage.getItem(SCORES_STORAGE_KEY) || '[]');
    return sortScores((Array.isArray(raw) ? raw : []).map(item => normalizeScoreEntry(item, { allowMissingDate: true })));
  }
  catch { return []; }
}

async function saveScoreToSupabase(entry) {
  if (!SUPA_URL || !SUPA_KEY) return;
  if (!canSubmitRemoteScore()) return;
  markRemoteScoreSubmit();
  try {
    const location = await getPlayerLocationInfo();
    await fetch(`${SUPA_URL}/scores`, {
      method: 'POST',
      headers: {
        'apikey': SUPA_KEY,
        'Authorization': `Bearer ${SUPA_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        name: entry.name, score: entry.score, diff: entry.diff,
        level: entry.level, won: entry.won,
        country: entry.country || location.country || '',
        city: entry.city || location.city || '',
        device: getDeviceType()
      })
    });
    cachedScores = null;
    scoresLastFetch = 0;
  } catch { /* falla silenciosamente */ }
}

function saveScore(entry) {
  const normalized = normalizeScoreEntry(entry);
  if (!normalized) return null;
  const scores = loadScores();
  scores.push(normalized);
  const topScores = sortScores(scores);
  localStorage.setItem(SCORES_STORAGE_KEY, JSON.stringify(topScores));
  saveScoreToSupabase(normalized);
  return normalized;
}
