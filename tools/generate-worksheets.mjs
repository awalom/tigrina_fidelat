// Builds one printable A4 tracing worksheet (HTML + PDF) per alphabet family.
// Usage: node tools/generate-worksheets.mjs [familyNumber ...]
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PRIMARY_ROWS, SECONDARY_ROWS } from '../src/data/fidelat-data.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'writing-excercises');
const chrome = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const SCHOOL = 'ቤት-ትምህርቲ ቋንቋ ኣደን ባህልን ኤርትራ ኣብ ካንቶን በርን';
const families = [...PRIMARY_ROWS, ...SECONDARY_ROWS];
const requested = process.argv.slice(2).map(Number);
const font = path.join(root, 'assets/fonts/NotoSansEthiopic.ttf');

const cell = (ch, solid) => `<svg viewBox="0 0 100 70" class="cell"><text x="50" y="56" text-anchor="middle" ${
  solid ? 'class="model"' : 'class="trace"'}>${ch}</text></svg>`;
const row = (letters, solid, cls = '') =>
  `<div class="row ${cls}">${letters.map((c) => cell(c, solid)).join('')}</div>`;

const page = (letters) => `<!doctype html><html lang="ti"><meta charset="utf-8"><style>
@font-face{font-family:Ethi;src:url("file://${font}")}
@page{size:A4;margin:0}
*{box-sizing:border-box}
body{margin:0;width:210mm;height:297mm;padding:14mm 15mm;font-family:Ethi,sans-serif;color:#174b84;position:relative}
header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #174b84;padding-bottom:4mm}
h1{margin:0;font-size:19px;line-height:1.25;max-width:105mm}
.fields{display:flex;gap:8mm;font-size:12px;color:#333}
.fields span{display:inline-block;border-bottom:1.5px solid #174b84;width:42mm;height:9mm;vertical-align:bottom}
.fields span.d{width:30mm}
.hint{margin:4mm 0;border:1px solid #9bb0cc;border-radius:6px;padding:2.5mm 4mm;font-size:12px;color:#333}
.model-row{background:#eef5ff;border-bottom:1.5px solid #174b84}
.row{display:grid;grid-template-columns:repeat(7,1fr);height:18.2mm}
.model-row{height:24mm}
.row.sep{border-top:1px solid #9bb0cc}
.cell{width:100%;height:100%}
text{font-family:Ethi}
.model{font-size:58px;font-weight:700;fill:#174b84}
.trace{font-size:58px;fill:none;stroke:#44546a;stroke-width:.8;stroke-dasharray:1.6 2.2;stroke-linecap:round}
.end{border-bottom:1px solid #9bb0cc}
footer{position:absolute;left:15mm;right:15mm;bottom:10mm;display:flex;justify-content:space-between;font-size:11px;color:#777}
</style><body>
<header><h1>${SCHOOL}</h1><div class="fields">ስም፡ <span></span> ዕለት፡ <span class="d"></span></div></header>
<div class="hint"><b>መምርሒ፡</b> ነቶም ነጥብታት ተኸቲልካ ጽሓፍ።</div>
<div class="model-row row">${letters.map((c) => cell(c, true)).join('')}</div>
${Array.from({ length: 10 }, (_, i) => row(letters, false, (i + 1) % 3 === 0 && i < 9 ? 'sep' : '')).join('\n')}
<div class="end"></div>
<footer><span>${SCHOOL}</span><span>${letters[0]}-ቤተሰብ</span></footer>
</body></html>`;

mkdirSync(outDir, { recursive: true });
const tmp = path.join(tmpdir(), 'fidel-worksheets');
mkdirSync(tmp, { recursive: true });
families.forEach((letters, i) => {
  if (requested.length && !requested.includes(i + 1)) return;
  const name = `family-${String(i + 1).padStart(2, '0')}`;
  const html = path.join(tmp, `${name}.html`);
  writeFileSync(html, page(letters));
  execFileSync(chrome, ['--headless=new', '--disable-gpu', '--allow-file-access-from-files',
    '--no-pdf-header-footer', `--print-to-pdf=${path.join(outDir, `${name}.pdf`)}`, `file://${html}`], { stdio: 'ignore' });
  console.log(`${name}.pdf ${letters.join('')}`);
});
rmSync(tmp, { recursive: true, force: true });
