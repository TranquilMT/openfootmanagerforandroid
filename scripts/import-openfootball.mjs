#!/usr/bin/env node
/**
 * OpenFootball -> OpenFoot Manager Android database importer.
 *
 * Input is normalized JSON produced from CC0 OpenFootball datasets. This
 * deliberately keeps network access out of the game build: source snapshots
 * are reviewed first, then converted deterministically into an OFM world.
 *
 * Normalized input:
 * {
 *   "name": "OpenFootball 2026-27",
 *   "description": "...",
 *   "clubs": [{"id":"...","name":"...","country":"ENG","city":"...","division":1}],
 *   "players": [{"id":"...","name":"...","clubId":"...","nationality":"ENG","position":"FW","dob":"2000-01-01"}]
 * }
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

const stableHash = (text) => {
  let h = 2166136261;
  for (const ch of text) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const positionMap = new Map([
  ['GK', 'GK'], ['G', 'GK'],
  ['DF', 'DEF'], ['D', 'DEF'], ['CB', 'DEF'], ['LB', 'DEF'], ['RB', 'DEF'],
  ['MF', 'MID'], ['M', 'MID'], ['DM', 'MID'], ['CM', 'MID'], ['AM', 'MID'],
  ['FW', 'FWD'], ['F', 'FWD'], ['ST', 'FWD'], ['CF', 'FWD'], ['LW', 'FWD'], ['RW', 'FWD'],
]);

const ratingFor = (player) => {
  const seed = stableHash(`${player.id ?? ''}:${player.name ?? ''}:${player.dob ?? ''}`);
  return 48 + (seed % 29); // deterministic 48..76 baseline; game progression owns later changes
};

const potentialFor = (player, rating) => {
  const seed = stableHash(`potential:${player.id ?? ''}:${player.name ?? ''}`);
  return Math.min(95, rating + 4 + (seed % 16));
};

const teams = clubs.map((club, index) => ({
  id: String(club.id ?? `of-club-${index + 1}`),
  name: String(club.name ?? `Club ${index + 1}`),
  shortName: String(club.shortName ?? club.name ?? `Club ${index + 1}`).slice(0, 18),
  country: String(club.country ?? 'INT').toUpperCase(),
  city: String(club.city ?? club.name ?? 'Unknown'),
  division: Number.isFinite(Number(club.division)) ? Number(club.division) : 1,
  reputation: Number.isFinite(Number(club.reputation)) ? Number(club.reputation) : 50,
}));

const teamIds = new Set(teams.map((team) => team.id));
const convertedPlayers = players
  .filter((player) => player.name && player.clubId && teamIds.has(String(player.clubId)))
  .map((player, index) => {
    const rating = ratingFor(player);
    return {
      id: String(player.id ?? `of-player-${index + 1}`),
      name: String(player.name),
      teamId: String(player.clubId),
      nationality: String(player.nationality ?? 'INT').toUpperCase(),
      position: positionMap.get(String(player.position ?? '').toUpperCase()) ?? 'MID',
      dateOfBirth: player.dob ?? null,
      overall: rating,
      potential: potentialFor(player, rating),
    };
  });

const world = {
  name: source.name ?? 'OpenFootball Real World 2026-27',
  description: source.description ?? 'CC0 OpenFootball identities adapted for OpenFoot Manager Android.',
  provenance: {
    provider: 'OpenFootball',
    license: 'CC0 / Public Domain',
    generatedBy: 'scripts/import-openfootball.mjs',
  },
  teams,
  players: convertedPlayers,
  staff: [],
};

if (teams.length < 2) throw new Error('Importer requires at least two clubs.');
if (convertedPlayers.length < 1) throw new Error('Importer produced no club-linked players.');

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(world, null, 2)}\n`);
console.log(`Wrote ${outputPath}: ${teams.length} clubs, ${convertedPlayers.length} players`);
