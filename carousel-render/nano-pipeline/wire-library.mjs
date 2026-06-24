// Generates: upload-manifest.txt (localPath<TAB>r2key) and inserts.sql (vault_items rows).
// Serving copies go to ultron-reels under imports/vertex-<deck>-<fmt>-<n>.png.
// Each deck+format becomes one carousel vault_item tagged "Vertex 1920" (9:16) or "Vertex 1355" (4:5).
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';

const OWNER = 'Doho2J2linQZYPsXsR95HWJPCr7XaMVA';
const OUT = 'out';
const TITLES = {
  agent10min: 'Ship an AI agent in 10 minutes, the brief is the build',
  appstore: 'Someone just built an app store for Claude Code',
  audit: 'I gave Claude access to all of my competitors',
  blueprint: '0 to 10K a month in 2026, the blueprint',
  cavestack: 'pov you built a startup in a cave with a box of scraps',
  contentdash: 'You need a content dashboard, here is how to build it',
  dashbuild: 'How to build a dashboard for your entire business',
  devteam: '6 apps you need to build SaaS in 2026',
  firstmil: 'the first 1M business run by AI agents',
  fourthings: '10k a month takes only 4 things',
  losing: '0 to 10k a month with one AI automation',
  metamcp: 'I replaced my marketing agency with Claude Code and Meta',
  openclaw: 'build websites for local businesses with AI, the vibe agency',
  repos10: '10 GitHub repos that shouldnt be free, the open-source stack',
  rubix: '6 paid tools you can build yourself with AI',
  skills50: '50+ Claude Skills, plug and play',
  softwarestack: 'I run a 500K a year solo consulting business at 23, the 9 tool stack',
  team200: 'I built a content team for 200 a month, meet the team',
  unfair: 'building a startup with AI instead of investors',
  workflows5: '5 Claude workflows that automate your marketing and content',
};
const FORMATS = [['916', 'Vertex 1920'], ['45', 'Vertex 1355']];
const sq = (s) => `'${String(s).replace(/'/g, "''")}'`;

// Ordered page files for a deck+format. openclaw lives at scratchpad root as f<fmt>-<n>.png.
function pages(deck, fmt) {
  const out = [];
  for (let n = 1; ; n++) {
    const local = deck === 'openclaw' ? `f${fmt}-${n}.png` : `${OUT}/${deck}-${fmt}-${n}.png`;
    if (!fs.existsSync(local)) break;
    out.push({ local, key: `imports/vertex-${deck}-${fmt}-${n}.png`, n });
  }
  return out;
}

const manifest = [];
const inserts = [];
let stamp = Date.now();
const summary = [];
for (const deck of Object.keys(TITLES)) {
  for (const [fmt, tag] of FORMATS) {
    const ps = pages(deck, fmt);
    if (!ps.length) { summary.push(`${deck} ${fmt}: MISSING`); continue; }
    for (const p of ps) manifest.push(`${p.local}\t${p.key}`);
    const media = ps.map((p) => ({ key: p.key, type: 'image', ext: 'png', contentType: 'image/png' }));
    const id = randomUUID();
    const createdAt = stamp++; // distinct, all land at top, grouped
    inserts.push(
      `INSERT INTO vault_items (id, owner, kind, name, source, duration_sec, thumb_key, thumb_url, media, tags, caption, created_at) VALUES (` +
      `${sq(id)}, ${sq(OWNER)}, 'carousel', ${sq(TITLES[deck])}, 'studio', NULL, NULL, NULL, ` +
      `${sq(JSON.stringify(media))}, ${sq(JSON.stringify([tag]))}, NULL, ${createdAt});`
    );
    summary.push(`${deck} ${fmt} (${tag}): ${ps.length} pages`);
  }
}

fs.writeFileSync('upload-manifest.txt', manifest.join('\n') + '\n');
fs.writeFileSync('inserts.sql', inserts.join('\n') + '\n');
console.log(summary.join('\n'));
console.log(`\nMANIFEST: ${manifest.length} files\nINSERTS: ${inserts.length} rows`);
