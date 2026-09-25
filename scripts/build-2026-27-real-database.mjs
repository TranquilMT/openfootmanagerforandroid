#!/usr/bin/env node
/** Build OFM's 2026/27 real-world starting database from CC0 OpenFootball sources.
 * Starting careers must use real clubs/players; procedural generation is reserved for future newgens.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const cache = path.join(root, '.cache', 'openfootball-2026-27');
const normalized = path.join(cache, 'normalized-2026-27.json');
const output = path.join(root, 'src-tauri', 'databases', 'openfootball-2026-27.json');
fs.mkdirSync(cache, { recursive: true });

const sources = {
  season: 'https://github.com/openfootball/football.json.git',
  players: 'https://github.com/openfootball/players.git',
  clubs: 'https://github.com/openfootball/clubs.git',
  worldcup: 'https://github.com/openfootball/worldcup.json.git'
};
for (const [name, url] of Object.entries(sources)) {
  const dir = path.join(cache, name);
  if (!fs.existsSync(dir)) execFileSync('git', ['clone', '--depth=1', url, dir], { stdio: 'inherit' });
  else execFileSync('git', ['-C', dir, 'pull', '--ff-only'], { stdio: 'inherit' });
}

const walk = (dir, pred, out=[]) => { for (const e of fs.readdirSync(dir,{withFileTypes:true})) { const p=path.join(dir,e.name); if(e.isDirectory()) walk(p,pred,out); else if(pred(p)) out.push(p); } return out; };
const slug = s => String(s??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const clubs = new Map();
const players = new Map();

// 2026/27 competition JSON establishes the real clubs participating this season.
for (const file of walk(path.join(cache,'season','2026-27'), p=>p.endsWith('.json'))) {
  let data; try { data=JSON.parse(fs.readFileSync(file,'utf8')); } catch { continue; }
  const scan = obj => {
    if (!obj || typeof obj !== 'object') return;
    if (obj.name && (obj.code || obj.country || obj.team || obj.club)) {
      const name=String(obj.name); const id=`club-${slug(name)}`;
      if(name.length>2 && name.length<100) clubs.set(id,{id,name,shortName:name,country:String(obj.country?.code??obj.country??'INT').slice(0,3).toUpperCase(),city:obj.city??name,division:1});
    }
    for (const v of Object.values(obj)) if (typeof v==='object') scan(v);
  }; scan(data);
}

// The 2026 World Cup squad file supplies a large current, explicit player->club mapping.
const squadFile=path.join(cache,'worldcup','2026','worldcup.squads.json');
if (fs.existsSync(squadFile)) {
  const squads=JSON.parse(fs.readFileSync(squadFile,'utf8'));
  for (const nation of squads) for (const p of (nation.players??[])) {
    if(!p.name || !p.club?.name) continue;
    const clubId=`club-${slug(p.club.name)}`;
    if(!clubs.has(clubId)) clubs.set(clubId,{id:clubId,name:p.club.name,shortName:p.club.name,country:String(p.club.country??'INT').toUpperCase(),city:p.club.name,division:1});
    const id=`player-${slug(p.name)}-${p.date_of_birth??'unknown'}`;
    players.set(id,{id,name:p.name,clubId,nationality:nation.fifa_code??'INT',position:p.pos??'MF',dob:p.date_of_birth??null,generated:false,leagueStrength:3,stats:{}});
  }
}

// Enrich DOB/height/position from the public-domain player catalogue where names match.
const catalogueFiles=walk(path.join(cache,'players'), p=>p.endsWith('.txt'));
const byName=new Map([...players.values()].map(p=>[slug(p.name),p]));
for(const file of catalogueFiles){
  const lines=fs.readFileSync(file,'utf8').split(/\r?\n/);
  for(const line of lines){
    const m=line.match(/^\s*([^=#][^,]+),\s*(G|GK|D|DF|M|MF|F|FW)\s*,?\s*(?:(\d\.\d{2})\s*m)?/i); if(!m) continue;
    const p=byName.get(slug(m[1].trim())); if(!p) continue;
    p.position=m[2].toUpperCase(); if(m[3]) p.heightCm=Math.round(Number(m[3])*100);
  }
}

const doc={
  name:'OpenFoot Manager Real World 2026/27',
  description:'Real 2026/27 clubs and players assembled from CC0 OpenFootball sources. Generated players are not used for the starting database.',
  season:'2026/27',
  clubs:[...clubs.values()], players:[...players.values()],
  provenance:{license:'CC0-1.0',sources:Object.values(sources),builtAt:new Date().toISOString()}
};
if(doc.clubs.length<20) throw new Error(`Only ${doc.clubs.length} clubs discovered`);
if(doc.players.length<100) throw new Error(`Only ${doc.players.length} real players discovered`);
fs.writeFileSync(normalized,JSON.stringify(doc,null,2));
execFileSync(process.execPath,[path.join(root,'scripts','import-openfootball.mjs'),normalized,output],{stdio:'inherit'});
console.log(`2026/27 real database built: ${doc.clubs.length} clubs / ${doc.players.length} real players`);
