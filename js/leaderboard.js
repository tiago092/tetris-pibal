// ---- Leaderboard / Supabase ----
const SUPA_URL = 'https://ucnaukurijvlmxgofhmv.supabase.co/rest/v1';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjbmF1a3VyaWp2bG14Z29maG12Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3MzgxMDQsImV4cCI6MjA5NDMxNDEwNH0.IZmwY81Gm_zRYWiuw0-1eTAcIh0h7-q4W5ZIDAuFml0';

let cachedScores = null;
let scoresLastFetch = 0;
let scoresFetchPromise = null;
let playerLocationPromise = null;
const SCORES_REFRESH_MS = 60000;

function getDeviceType() {
  return /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
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
      const scores = data.map(r => ({
        name: r.name, score: r.score, diff: r.diff || '',
        level: r.level || 1, won: r.won || false,
        country: r.country || '', city: r.city || '',
        date: r.created_at ? new Date(r.created_at).toLocaleDateString() : ''
      }));
      cachedScores = scores;
      scoresLastFetch = Date.now();
      localStorage.setItem('tetrispibal_scores', JSON.stringify(scores));
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
  try { return JSON.parse(localStorage.getItem('tetrispibal_scores') || '[]'); }
  catch { return []; }
}

async function saveScoreToSupabase(entry) {
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
  const scores = loadScores();
  scores.push(entry);
  scores.sort((a,b) => b.score - a.score);
  localStorage.setItem('tetrispibal_scores', JSON.stringify(scores.slice(0, 10)));
  saveScoreToSupabase(entry);
}
