// ---- Leaderboard / Supabase ----
const SUPA_URL = 'https://ucnaukurijvlmxgofhmv.supabase.co/rest/v1';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjbmF1a3VyaWp2bG14Z29maG12Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3MzgxMDQsImV4cCI6MjA5NDMxNDEwNH0.IZmwY81Gm_zRYWiuw0-1eTAcIh0h7-q4W5ZIDAuFml0';

let cachedScores = null;
let geoInfo = null;

async function fetchGeoInfo() {
  if (geoInfo) return geoInfo;
  try {
    const res = await fetch('https://ipapi.co/json/');
    if (!res.ok) throw new Error();
    const d = await res.json();
    geoInfo = { country: d.country_name || '', city: d.city || '' };
  } catch {
    geoInfo = { country: '', city: '' };
  }
  return geoInfo;
}

function getDeviceType() {
  return /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
}

async function fetchScoresFromSupabase() {
  try {
    const res = await fetch(`${SUPA_URL}/scores?order=score.desc&limit=10`, {
      headers: { 'apikey': SUPA_KEY, 'Authorization': `Bearer ${SUPA_KEY}` }
    });
    if (!res.ok) throw new Error('fetch failed');
    const data = await res.json();
    const scores = data.map(r => ({
      name: r.name, score: r.score, diff: r.diff || '',
      level: r.level || 1, won: r.won || false,
      date: r.created_at ? new Date(r.created_at).toLocaleDateString() : ''
    }));
    cachedScores = scores;
    localStorage.setItem('tetrispibal_scores', JSON.stringify(scores));
    return scores;
  } catch {
    return null;
  }
}

function loadScores() {
  try { return JSON.parse(localStorage.getItem('tetrispibal_scores') || '[]'); }
  catch { return []; }
}

async function saveScoreToSupabase(entry) {
  try {
    const geo = await fetchGeoInfo();
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
        country: geo.country, city: geo.city, device: getDeviceType()
      })
    });
    cachedScores = null;
  } catch { /* falla silenciosamente */ }
}

function saveScore(entry) {
  const scores = loadScores();
  scores.push(entry);
  scores.sort((a,b) => b.score - a.score);
  localStorage.setItem('tetrispibal_scores', JSON.stringify(scores.slice(0, 10)));
  saveScoreToSupabase(entry);
}

// Pre-cargar scores y geo al iniciar
fetchScoresFromSupabase();
fetchGeoInfo();
