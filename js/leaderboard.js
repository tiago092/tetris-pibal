// ---- Leaderboard / Supabase ----
// La anon key es publica en clientes web. La validacion de abajo mejora el
// cliente, pero la proteccion real contra abuso debe vivir en RLS/rate limits.
const SUPA_CONFIG = window.TETRIS_PIBAL_SUPABASE || {};
const SUPA_BASE_URL = String(SUPA_CONFIG.url || '').replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
const SUPA_URL = SUPA_BASE_URL ? `${SUPA_BASE_URL}/rest/v1` : '';
const SUPA_KEY = String(SUPA_CONFIG.anonKey || '');
const SUPA_ENABLED = !!(SUPA_URL && SUPA_KEY);

let cachedScores = null;
let scoresLastFetch = 0;
let scoresFetchPromise = null;
let scoresFetchFailed = false;
let lastLeaderboardError = '';
let lastScoreSubmitStatus = 'idle';
let playerLocationPromise = null;
const SCORES_REFRESH_MS = 60000;
const SCORES_RETRY_MS = 10000;
const SCORES_STORAGE_KEY = 'tetrispibal_scores';

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

function scoreNameKey(name) {
  return sanitizeText(name, 16).toLocaleLowerCase();
}

function dedupeScoresByName(scores) {
  const bestByName = new Map();
  scores.filter(Boolean).forEach(score => {
    const key = scoreNameKey(score.name);
    const prev = bestByName.get(key);
    if (!prev || score.score > prev.score) bestByName.set(key, score);
  });
  return sortScores(Array.from(bestByName.values()));
}

function isSupabaseLeaderboardEnabled() {
  return SUPA_ENABLED;
}

function rememberLeaderboardError(message) {
  lastLeaderboardError = sanitizeText(message, 240);
  if (lastLeaderboardError) console.warn(`[ranking] ${lastLeaderboardError}`);
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

function getPlayerLocationInfoQuickly() {
  return Promise.race([
    getPlayerLocationInfo(),
    new Promise(resolve => setTimeout(() => resolve({ country: '', city: '' }), 700))
  ]);
}

async function fetchScoresFromSupabase() {
  if (!SUPA_ENABLED) return null;
  if (scoresFetchPromise) return scoresFetchPromise;
  const now = Date.now();
  if (cachedScores && now - scoresLastFetch < SCORES_REFRESH_MS) return cachedScores;
  if (scoresFetchFailed && now - scoresLastFetch < SCORES_RETRY_MS) return null;

  const query = 'select=name,score,diff,level,won,country,city,created_at&order=score.desc,created_at.asc&limit=10';
  scoresFetchPromise = fetch(`${SUPA_URL}/scores?${query}`, {
    cache: 'no-store',
    headers: {
      'apikey': SUPA_KEY,
      'Authorization': `Bearer ${SUPA_KEY}`
    }
  })
    .then(res => {
      if (!res.ok) throw new Error('fetch failed');
      return res.json();
    })
    .then(data => {
      const scores = dedupeScoresByName(Array.isArray(data) ? data.map(normalizeRemoteScore) : []);
      cachedScores = scores;
      scoresLastFetch = Date.now();
      scoresFetchFailed = false;
      localStorage.setItem(SCORES_STORAGE_KEY, JSON.stringify(scores));
      return scores;
    })
    .catch(() => {
      scoresFetchFailed = true;
      scoresLastFetch = Date.now();
      rememberLeaderboardError('No se pudo cargar el ranking desde Supabase.');
      return null;
    })
    .finally(() => { scoresFetchPromise = null; });

  return scoresFetchPromise;
}

function refreshScoresFromSupabase() {
  scoresLastFetch = 0;
  return fetchScoresFromSupabase();
}

function loadLocalScores() {
  try {
    const raw = JSON.parse(localStorage.getItem(SCORES_STORAGE_KEY) || '[]');
    return dedupeScoresByName((Array.isArray(raw) ? raw : []).map(item => normalizeScoreEntry(item, { allowMissingDate: true })));
  }
  catch { return []; }
}

function loadScores() {
  if (!SUPA_ENABLED) return loadLocalScores();
  return cachedScores ? cachedScores : [];
}

function getLeaderboardStatus() {
  if (!SUPA_ENABLED) return 'local';
  if (scoresFetchPromise && !cachedScores) return 'loading';
  if (scoresFetchFailed && !cachedScores) return 'error';
  if (scoresFetchFailed && cachedScores) return 'stale';
  if (cachedScores) return 'online';
  return 'loading';
}

function getLeaderboardDebugInfo() {
  return {
    supabaseEnabled: SUPA_ENABLED,
    supabaseUrl: SUPA_BASE_URL,
    hasAnonKey: !!SUPA_KEY,
    status: getLeaderboardStatus(),
    lastSubmitStatus: lastScoreSubmitStatus,
    lastError: lastLeaderboardError,
    cachedScores: cachedScores ? cachedScores.length : 0
  };
}

async function saveScoreToSupabase(entry) {
  if (!SUPA_ENABLED) {
    lastScoreSubmitStatus = 'disabled';
    return false;
  }
  lastScoreSubmitStatus = 'saving';
  try {
    const location = await getPlayerLocationInfoQuickly();
    const payload = {
      name: entry.name, score: entry.score, diff: entry.diff,
      level: entry.level, won: entry.won,
      country: entry.country || location.country || '',
      city: entry.city || location.city || '',
      device: getDeviceType()
    };
    const res = await fetch(`${SUPA_URL}/scores`, {
      method: 'POST',
      headers: {
        'apikey': SUPA_KEY,
        'Authorization': `Bearer ${SUPA_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(payload)
    });
    if (res.status === 409) {
      const key = encodeURIComponent(scoreNameKey(entry.name));
      const betterScoreRes = await fetch(`${SUPA_URL}/scores?name_key=eq.${key}&score=lt.${entry.score}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPA_KEY,
          'Authorization': `Bearer ${SUPA_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(payload)
      });
      if (!betterScoreRes.ok) {
        const detail = await betterScoreRes.text().catch(() => '');
        throw new Error(`Supabase rechazo actualizar el puntaje (${betterScoreRes.status}): ${detail || betterScoreRes.statusText}`);
      }
    } else if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`Supabase rechazo el puntaje (${res.status}): ${detail || res.statusText}`);
    }
    cachedScores = null;
    scoresLastFetch = 0;
    scoresFetchFailed = false;
    lastScoreSubmitStatus = 'saved';
    lastLeaderboardError = '';
    refreshScoresFromSupabase();
    return true;
  } catch (error) {
    scoresFetchFailed = true;
    scoresLastFetch = Date.now();
    lastScoreSubmitStatus = 'error';
    rememberLeaderboardError(error && error.message ? error.message : 'No se pudo guardar el puntaje en Supabase.');
    return false;
  }
}

function saveScore(entry) {
  const normalized = normalizeScoreEntry(entry);
  if (!normalized) return null;
  if (SUPA_ENABLED) {
    saveScoreToSupabase(normalized);
    return normalized;
  }
  const scores = loadLocalScores();
  scores.push(normalized);
  const topScores = dedupeScoresByName(scores);
  localStorage.setItem(SCORES_STORAGE_KEY, JSON.stringify(topScores));
  return normalized;
}

window.tetrisPibalLeaderboardDebug = getLeaderboardDebugInfo;
