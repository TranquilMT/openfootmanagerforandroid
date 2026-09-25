#!/usr/bin/env node
/**
 * OpenFootball -> OpenFoot Manager Android database importer.
 * Real players use sourced football statistics; generated players use seeded generation.
 */
import fs from 'node:fs';
import path from 'node:path';

const [inputPath, outputPath = 'src-tauri/databases/openfootball-2026-27.json'] = process.argv.slice(2);
if (!inputPath) {
  console.error('Usage: node scripts/import-openfootball.mjs <normalized-source.json> [output.json]');
  process.exit(2);
}
const source = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const clubs = Array.isArray(source.clubs) ? source.clubs : [];
const players = Array.isArray(source.players) ? source.players : [];

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const num = (v, fallback = 0) => Number.isFinite(Number(v)) ? Number(v) : fallback;
const stableHash = (text) => {
  let h = 2166136261;
  for (const ch of text) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
};
const positionMap = new Map([
  ['GK','GK'],['G','GK'],['DF','DEF'],['D','DEF'],['CB','DEF'],['LB','DEF'],['RB','DEF'],
  ['MF','MID'],['M','MID'],['DM','MID'],['CM','MID'],['AM','MID'],
  ['FW','FWD'],['F','FWD'],['ST','FWD'],['CF','FWD'],['LW','FWD'],['RW','FWD'],
]);
const normalizePosition = (p) => positionMap.get(String(p ?? '').toUpperCase()) ?? 'MID';

// Converts observable season performance to OFM's game scale. No proprietary ratings are copied.
const realPerformanceRating = (player) => {
  const s = player.stats ?? {};
  const minutes = num(s.minutes);
  const apps = Math.max(1, num(s.appearances));
  const per90 = (value) => minutes > 0 ? num(value) * 90 / minutes : num(value) / apps;
  const pos = normalizePosition(player.position);
  const leagueStrength = clamp(num(player.leagueStrength, 3), 1, 5);
  const starter = clamp(minutes / Math.max(1, num(s.teamMinutes, 3420)), 0, 1);
  let score = 44 + leagueStrength * 4 + starter * 8;

  if (pos === 'FWD') {
    score += clamp(per90(s.goals) * 13, 0, 12) + clamp(per90(s.assists) * 8, 0, 7);
    score += clamp(per90(s.shotsOnTarget) * 1.5, 0, 4);
  } else if (pos === 'MID') {
    score += clamp(per90(s.goals) * 8, 0, 7) + clamp(per90(s.assists) * 10, 0, 8);
    score += clamp(per90(s.keyPasses) * 1.5, 0, 5) + clamp(per90(s.tackles) * 0.6, 0, 3);
  } else if (pos === 'DEF') {
    score += clamp(per90(s.tackles) * 1.1, 0, 6) + clamp(per90(s.interceptions) * 1.2, 0, 6);
    score += clamp(num(s.cleanSheets) / apps * 5, 0, 4);
  } else {
    const savePct = num(s.savePercentage, 65);
    score += clamp((savePct - 60) * 0.45, 0, 10) + clamp(num(s.cleanSheets) / apps * 7, 0, 6);
  }
  return Math.round(clamp(score, 40, 94));
};

const generatedRating = (player) => 45 + (stableHash(`gen:${player.id ?? ''}:${player.name ?? ''}`) % 32);
const generatedPotential = (player, rating) => clamp(rating + 5 + (stableHash(`pot:${player.id ?? ''}`) % 16), rating, 95);
const realPotential = (player, rating) => {
  const age = num(player.age, 25);
  const headroom = age <= 19 ? 14 : age <= 22 ? 10 : age <= 25 ? 6 : age <= 28 ? 3 : 0;
  return clamp(rating + headroom, rating, 95);
};

const teams = clubs.map((club, index) => ({
  id: String(club.id ?? `of-club-${index + 1}`), name: String(club.name ?? `Club ${index + 1}`),
  shortName: String(club.shortName ?? club.name ?? `Club ${index + 1}`).slice(0,18),
  country: String(club.country ?? 'INT').toUpperCase(), city: String(club.city ?? club.name ?? 'Unknown'),
  division: num(club.division,1), reputation: num(club.reputation,50),
}));
const teamIds = new Set(teams.map(t => t.id));
const convertedPlayers = players.filter(p => p.name && p.clubId && teamIds.has(String(p.clubId))).map((player,index) => {
  const generated = player.generated === true;
  const rating = generated ? generatedRating(player) : realPerformanceRating(player);
  return {
    id: String(player.id ?? `of-player-${index+1}`), name: String(player.name), teamId: String(player.clubId),
    nationality: String(player.nationality ?? 'INT').toUpperCase(), position: normalizePosition(player.position),
    dateOfBirth: player.dob ?? null, preferredFoot: player.preferredFoot ?? null, heightCm: player.heightCm ?? null,
    overall: rating, potential: generated ? generatedPotential(player,rating) : realPotential(player,rating),
    dataKind: generated ? 'generated' : 'real',
    realStats: generated ? undefined : (player.stats ?? {}),
    ratingMethod: generated ? 'seeded-generation-v1' : 'real-performance-v1',
  };
});
const world = {
  name: source.name ?? 'OpenFootball Real World 2026-27',
  description: source.description ?? 'Open football identities and performance-derived OFM attributes.',
  provenance: { provider:'OpenFootball + compatible open statistical sources', license:'CC0 / compatible open data only', generatedBy:'scripts/import-openfootball.mjs', ratingModel:'real-performance-v1' },
  teams, players: convertedPlayers, staff: [],
};
if (teams.length < 2) throw new Error('Importer requires at least two clubs.');
if (convertedPlayers.length < 1) throw new Error('Importer produced no club-linked players.');
fs.mkdirSync(path.dirname(outputPath), { recursive:true });
fs.writeFileSync(outputPath, `${JSON.stringify(world,null,2)}\n`);
console.log(`Wrote ${outputPath}: ${teams.length} clubs, ${convertedPlayers.length} players`);
