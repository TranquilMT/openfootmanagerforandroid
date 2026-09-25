#!/usr/bin/env node
/** Build OFM's 2026/27 real-world starting database from redistributable/open sources.
 * Real players are never replaced by procedural starters. Generated players are reserved for future newgens.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root=process.cwd();
const cache=path.join(root,'.cache','ofm-real-2026-27');
const normalized=path.join(cache,'normalized-2026-27.json');
const output=path.join(root,'src-tauri','databases','openfootball-2026-27.json');
fs.mkdirSync(cache,{recursive:true});
const sources={
 season:'https://github.com/openfootball/football.json.git',
 players:'https://github.com/openfootball/players.git',
 clubs:'https://github.com/openfootball/clubs.git',
 worldcup:'https://github.com/openfootball/worldcup.json.git',
 transfermarkt:'https://github.com/dcaribou/transfermarkt-datasets.git',
 reep:'https://github.com/withqwerty/reep.git'
};
for(const [name,url] of Object.entries(sources)){
 const dir=path.join(cache,name);
 if(!fs.existsSync(dir)) execFileSync('git',['clone','--depth=1',url,dir],{stdio:'inherit'});
 else execFileSync('git',['-C',dir,'pull','--ff-only'],{stdio:'inherit'});
}
const walk=(dir,pred,out=[])=>{if(!fs.existsSync(dir))return out;for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p,pred,out);else if(pred(p))out.push(p);}return out;};
const slug=s=>String(s??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const clubs=new Map(),players=new Map(),nationalTeams=new Map();
const ensureClub=(name,country='INT',extra={})=>{const id=`club-${slug(name)}`;if(!clubs.has(id))clubs.set(id,{id,name,shortName:name,country:String(country??'INT').slice(0,3).toUpperCase(),city:extra.city??name,division:Number(extra.division??1)});return id;};
const upsertPlayer=p=>{const key=p.id??`player-${slug(p.name)}-${p.dob??'unknown'}`;const old=players.get(key)??{};players.set(key,{...old,...p,id:key,generated:false});};

// 2026/27 fixture data is authoritative for participating club identities.
for(const file of walk(path.join(cache,'season','2026-27'),p=>p.endsWith('.json'))){let d;try{d=JSON.parse(fs.readFileSync(file,'utf8'));}catch{continue;}for(const m of d.matches??[]){for(const t of [m.team1,m.team2]){const name=typeof t==='string'?t:t?.name;if(name)ensureClub(name);}}}

// 2026 World Cup squads: preserve national-team membership AND current club mapping.
const squadCandidates=walk(path.join(cache,'worldcup'),p=>/2026.*squads.*\.json$/i.test(p)||/worldcup\.squads\.json$/i.test(p));
for(const squadFile of squadCandidates){let squads;try{squads=JSON.parse(fs.readFileSync(squadFile,'utf8'));}catch{continue;}for(const nation of (Array.isArray(squads)?squads:(squads.teams??[]))){const nationName=nation.name??nation.team??nation.country??nation.fifa_code??'International';const nationId=`nation-${slug(nationName)}`;if(!nationalTeams.has(nationId))nationalTeams.set(nationId,{id:nationId,name:nationName,code:nation.fifa_code??nation.code??'INT',players:[]});for(const p of nation.players??nation.squad??[]){if(!p.name)continue;const clubName=p.club?.name??p.club??'Unattached';const clubId=ensureClub(clubName,p.club?.country??'INT');const id=`player-${slug(p.name)}-${p.date_of_birth??p.dob??'unknown'}`;upsertPlayer({id,name:p.name,clubId,nationality:nation.fifa_code??nation.code??nationName,position:p.pos??p.position??'MF',dob:p.date_of_birth??p.dob??null,heightCm:p.height_cm??null,leagueStrength:3,stats:{},sources:['openfootball-worldcup-2026']});nationalTeams.get(nationId).players.push(id);}}}

// OpenFootball public-domain player catalogue enriches matching identities.
const byName=()=>new Map([...players.values()].map(p=>[slug(p.name),p]));
let names=byName();
for(const file of walk(path.join(cache,'players'),p=>p.endsWith('.txt'))){for(const line of fs.readFileSync(file,'utf8').split(/\r?\n/)){const m=line.match(/^\s*([^=#][^,]+),\s*(G|GK|D|DF|M|MF|F|FW)\s*,?\s*(?:(\d\.\d{2})\s*m)?/i);if(!m)continue;const p=names.get(slug(m[1].trim()));if(!p)continue;p.position=m[2].toUpperCase();if(m[3])p.heightCm=Math.round(Number(m[3])*100);p.sources=[...(p.sources??[]),'openfootball-players'];}}

// Transfermarkt dataset snapshot (current through 2026-07) fills club squads and real performance history.
// We consume published CSV snapshots when present; no scraping is performed here.
const csvFiles=walk(path.join(cache,'transfermarkt'),p=>p.endsWith('.csv'));
const findCsv=n=>csvFiles.find(p=>path.basename(p)===n);
const parseCsv=text=>{const rows=[];let row=[],field='',q=false;for(let i=0;i<=text.length;i++){const c=text[i]??'\n';if(q){if(c==='"'&&text[i+1]==='"'){field+='"';i++;}else if(c==='"')q=false;else field+=c;}else if(c==='"')q=true;else if(c===','){row.push(field);field='';}else if(c==='\n'){row.push(field.replace(/\r$/,''));if(row.some(Boolean))rows.push(row);row=[];field='';}else field+=c;}if(rows.length<2)return[];const h=rows[0];return rows.slice(1).map(r=>Object.fromEntries(h.map((k,i)=>[k,r[i]??''])));};
const readCsv=n=>{const f=findCsv(n);return f?parseCsv(fs.readFileSync(f,'utf8')):[];};
const tmClubs=new Map(readCsv('clubs.csv').map(c=>[c.club_id,c]));
for(const p of readCsv('players.csv')){if(!p.name||!p.current_club_id)continue;const c=tmClubs.get(p.current_club_id);if(!c)continue;const clubId=ensureClub(c.name??c.club_name??`Club ${p.current_club_id}`,c.domestic_competition_id??'INT');const dob=p.date_of_birth||null;const id=`tm-${p.player_id}`;upsertPlayer({id,name:p.name,clubId,nationality:p.country_of_citizenship??p.country_of_birth??'INT',position:p.position??p.sub_position??'MF',dob,heightCm:p.height_in_cm?Number(p.height_in_cm):null,preferredFoot:p.foot??null,marketValue:p.market_value_in_eur?Number(p.market_value_in_eur):null,leagueStrength:3,stats:{},sources:['transfermarkt-datasets-2026-07']});}
// Aggregate the latest published appearances into real player statistics for OFM ratings.
const apps=readCsv('appearances.csv');const stats=new Map();
for(const a of apps){const id=`tm-${a.player_id}`;if(!players.has(id))continue;const s=stats.get(id)??{appearances:0,minutes:0,goals:0,assists:0,yellowCards:0,redCards:0};s.appearances++;s.minutes+=Number(a.minutes_played??0);s.goals+=Number(a.goals??0);s.assists+=Number(a.assists??0);s.yellowCards+=Number(a.yellow_cards??0);s.redCards+=Number(a.red_cards??0);stats.set(id,s);}for(const [id,s] of stats)players.get(id).stats=s;

// Reep is used as an identity crosswalk only, allowing later providers to resolve to the same person/team.
const reepSnapshots=walk(path.join(cache,'reep'),p=>/\.(csv|json)$/i.test(p));
const provenance={licenseNotes:['OpenFootball data is CC0/public domain.','Transfermarkt-datasets snapshot is used only according to its published repository terms; verify redistribution terms before a public release.','Reep is used for identity reconciliation.','No EA/FC/Football Manager proprietary ratings are copied. OFM attributes are calculated from permitted factual performance data.'],sources:Object.values(sources),reepIdentityFiles:reepSnapshots.length,builtAt:new Date().toISOString()};
const doc={name:'OpenFoot Manager Real World 2026/27',description:'Multi-source 2026/27 world with real clubs, real players and 2026 World Cup national squads.',season:'2026/27',clubs:[...clubs.values()],players:[...players.values()],nationalTeams:[...nationalTeams.values()],provenance};
if(doc.clubs.length<20)throw new Error(`Only ${doc.clubs.length} clubs discovered`);if(doc.players.length<100)throw new Error(`Only ${doc.players.length} real players discovered`);
fs.writeFileSync(normalized,JSON.stringify(doc,null,2));execFileSync(process.execPath,[path.join(root,'scripts','import-openfootball.mjs'),normalized,output],{stdio:'inherit'});console.log(`2026/27 database: ${doc.clubs.length} clubs / ${doc.players.length} real players / ${doc.nationalTeams.length} World Cup teams`);
