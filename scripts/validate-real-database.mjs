#!/usr/bin/env node
import fs from 'node:fs';
const file = process.argv[2];
if (!file) throw new Error('Usage: node scripts/validate-real-database.mjs <database.json>');
const db = JSON.parse(fs.readFileSync(file,'utf8'));
const teams = db.teams ?? [];
const players = db.players ?? [];
const ids = new Set(teams.map(t=>String(t.id)));
const errors=[];
if (teams.length < 2) errors.push('database needs at least two teams');
if (!players.length) errors.push('database has no players');
for (const p of players) {
 if (!p.id || !p.name || !p.teamId) errors.push(`invalid player identity: ${p.name ?? p.id ?? 'unknown'}`);
 if (!ids.has(String(p.teamId))) errors.push(`unknown team ${p.teamId} for ${p.name}`);
 if (!['GK','DEF','MID','FWD'].includes(p.position)) errors.push(`invalid position ${p.position} for ${p.name}`);
 if (!(p.overall >= 1 && p.overall <= 100)) errors.push(`invalid overall for ${p.name}`);
 if (!(p.potential >= p.overall && p.potential <= 100)) errors.push(`invalid potential for ${p.name}`);
 if (p.dataKind === 'real' && p.ratingMethod !== 'real-performance-v1') errors.push(`real player lacks real rating method: ${p.name}`);
 if (p.dataKind === 'generated' && p.ratingMethod !== 'seeded-generation-v1') errors.push(`generated player lacks generated rating method: ${p.name}`);
}
if (errors.length) { console.error(errors.slice(0,50).join('\n')); process.exit(1); }
console.log(`OK: ${teams.length} teams, ${players.length} players; real=${players.filter(p=>p.dataKind==='real').length}, generated=${players.filter(p=>p.dataKind==='generated').length}`);
